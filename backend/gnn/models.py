import math
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Optional, List, Tuple

def scatter_sum(src: torch.Tensor, index: torch.Tensor, dim: int = 0, dim_size: Optional[int] = None) -> torch.Tensor:
    """
    Pure PyTorch scatter sum without requiring torch_scatter C++ binaries.
    Works seamlessly on all platforms (Windows, Linux, macOS) on CPU and GPU.
    """
    if dim_size is None:
        dim_size = int(index.max()) + 1 if index.numel() > 0 else 0
    shape = list(src.shape)
    shape[dim] = dim_size
    out = torch.zeros(shape, dtype=src.dtype, device=src.device)
    return out.index_add_(dim, index, src)

def add_self_loops(edge_index: torch.Tensor, num_nodes: int) -> torch.Tensor:
    """
    Adds self loops (i, i) to edge_index.
    """
    loop_index = torch.arange(0, num_nodes, dtype=edge_index.dtype, device=edge_index.device)
    loop_index = loop_index.unsqueeze(0).repeat(2, 1)
    edge_index = torch.cat([edge_index, loop_index], dim=1)
    # Remove duplicates if any
    return torch.unique(edge_index, dim=1)

class GCNConv(nn.Module):
    """
    Graph Convolutional Layer (Kipf & Welling, ICLR 2017)
    H^(l+1) = D~^{-1/2} A~ D~^{-1/2} H^(l) W
    """
    def __init__(self, in_features: int, out_features: int, bias: bool = True):
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.linear = nn.Linear(in_features, out_features, bias=bias)
        self.reset_parameters()

    def reset_parameters(self):
        nn.init.xavier_uniform_(self.linear.weight)
        if self.linear.bias is not None:
            nn.init.zeros_(self.linear.bias)

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        num_nodes = x.size(0)
        # Add self loops
        edge_index = add_self_loops(edge_index, num_nodes)
        row, col = edge_index[0], edge_index[1]

        # Compute degree D~
        deg = scatter_sum(torch.ones_like(row, dtype=x.dtype), row, dim_size=num_nodes)
        deg_inv_sqrt = deg.pow(-0.5)
        deg_inv_sqrt[torch.isinf(deg_inv_sqrt)] = 0.0

        # Normalization factor norm = D~^{-1/2}_i * D~^{-1/2}_j
        norm = deg_inv_sqrt[row] * deg_inv_sqrt[col]

        # Linear projection
        h = self.linear(x)

        # Message passing: sum_j norm * h_j
        msg = h[col] * norm.unsqueeze(-1)
        out = scatter_sum(msg, row, dim=0, dim_size=num_nodes)
        return out

class SAGEConv(nn.Module):
    """
    GraphSAGE Layer (Hamilton et al., NeurIPS 2017)
    Mean aggregation over neighborhood, concatenated with self-features.
    """
    def __init__(self, in_features: int, out_features: int, bias: bool = True):
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.lin_self = nn.Linear(in_features, out_features, bias=bias)
        self.lin_neigh = nn.Linear(in_features, out_features, bias=False)
        self.reset_parameters()

    def reset_parameters(self):
        nn.init.xavier_uniform_(self.lin_self.weight)
        nn.init.xavier_uniform_(self.lin_neigh.weight)
        if self.lin_self.bias is not None:
            nn.init.zeros_(self.lin_self.bias)

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        num_nodes = x.size(0)
        row, col = edge_index[0], edge_index[1]

        # Degree for mean aggregation
        deg = scatter_sum(torch.ones_like(row, dtype=x.dtype), row, dim_size=num_nodes)
        deg = torch.clamp(deg, min=1.0)

        # Neighbor aggregation
        msg = x[col]
        agg = scatter_sum(msg, row, dim=0, dim_size=num_nodes) / deg.unsqueeze(-1)

        # Combine self and aggregated neighborhood
        out = self.lin_self(x) + self.lin_neigh(agg)
        return out

class GATConv(nn.Module):
    """
    Graph Attention Network Layer (Veličković et al., ICLR 2018)
    Multi-head self-attention over node graph neighborhoods.
    """
    def __init__(self, in_features: int, out_features: int, heads: int = 4, concat: bool = True, dropout: float = 0.1, bias: bool = True):
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.heads = heads
        self.concat = concat
        self.dropout = dropout

        self.lin = nn.Linear(in_features, heads * out_features, bias=False)
        self.att_src = nn.Parameter(torch.Tensor(1, heads, out_features))
        self.att_dst = nn.Parameter(torch.Tensor(1, heads, out_features))
        if bias:
            out_dim = heads * out_features if concat else out_features
            self.bias = nn.Parameter(torch.Tensor(out_dim))
        else:
            self.register_parameter('bias', None)
        self.reset_parameters()

    def reset_parameters(self):
        nn.init.xavier_uniform_(self.lin.weight)
        nn.init.xavier_uniform_(self.att_src)
        nn.init.xavier_uniform_(self.att_dst)
        if self.bias is not None:
            nn.init.zeros_(self.bias)

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        num_nodes = x.size(0)
        edge_index = add_self_loops(edge_index, num_nodes)
        row, col = edge_index[0], edge_index[1]

        # Linear projection: [N, H, D]
        h = self.lin(x).view(-1, self.heads, self.out_features)

        # Attention coefficients
        alpha_src = (h * self.att_src).sum(dim=-1) # [N, H]
        alpha_dst = (h * self.att_dst).sum(dim=-1) # [N, H]

        alpha = alpha_src[row] + alpha_dst[col] # [E, H]
        alpha = F.leaky_relu(alpha, negative_slope=0.2)

        # Softmax over row
        # Numerically stable softmax with scatter max
        # Simplified softmax for sparse graphs
        alpha_exp = torch.exp(torch.clamp(alpha, -10.0, 10.0))
        alpha_sum = scatter_sum(alpha_exp, row, dim=0, dim_size=num_nodes) + 1e-12
        alpha_norm = alpha_exp / alpha_sum[row] # [E, H]
        alpha_norm = F.dropout(alpha_norm, p=self.dropout, training=self.training)

        # Weighted sum: [E, H, D] * [E, H, 1]
        msg = h[col] * alpha_norm.unsqueeze(-1)
        out = scatter_sum(msg, row, dim=0, dim_size=num_nodes) # [N, H, D]

        if self.concat:
            out = out.view(-1, self.heads * self.out_features)
        else:
            out = out.mean(dim=1)

        if self.bias is not None:
            out = out + self.bias
        return out

class GNNModel(nn.Module):
    """
    Configurable multi-layer Graph Neural Network supporting GCN, GraphSAGE, and GAT.
    """
    def __init__(
        self,
        arch: str,
        in_features: int,
        hidden_dim: int,
        out_features: int,
        num_layers: int = 2,
        dropout: float = 0.5,
        heads: int = 4
    ):
        super().__init__()
        self.arch = arch.lower()
        self.dropout = dropout
        self.layers = nn.ModuleList()

        curr_in = in_features
        for i in range(num_layers):
            is_last = (i == num_layers - 1)
            curr_out = out_features if is_last else hidden_dim

            if self.arch == "gcn":
                layer = GCNConv(curr_in, curr_out)
            elif self.arch in ["sage", "graphsage"]:
                layer = SAGEConv(curr_in, curr_out)
            elif self.arch == "gat":
                h = 1 if is_last else heads
                concat = not is_last
                layer = GATConv(curr_in, curr_out // h if concat else curr_out, heads=h, concat=concat, dropout=dropout)
            else:
                raise ValueError(f"Unknown GNN architecture: {arch}")

            self.layers.append(layer)
            curr_in = curr_out

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        h = x
        for i, layer in enumerate(self.layers):
            h = layer(h, edge_index)
            if i < len(self.layers) - 1:
                h = F.relu(h)
                h = F.dropout(h, p=self.dropout, training=self.training)
        return h
