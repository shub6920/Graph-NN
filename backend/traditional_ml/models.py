from typing import Dict, Any, Tuple, Optional
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier

def create_traditional_model(model_name: str, hyperparameters: Optional[Dict[str, Any]] = None, random_state: int = 42):
    """
    Factory function to initialize traditional machine learning models with hyperparameters.
    """
    params = hyperparameters or {}
    name_clean = model_name.strip().lower()

    if name_clean in ["logistic regression", "logistic_regression", "lr"]:
        c_val = float(params.get("C", 1.0))
        max_iter = int(params.get("max_iter", 1000))
        penalty = params.get("penalty", "l2")
        solver = params.get("solver", "lbfgs")
        return LogisticRegression(
            C=c_val,
            max_iter=max_iter,
            penalty=penalty,
            solver=solver,
            random_state=random_state
        )

    elif name_clean in ["random forest", "random_forest", "rf", "random forest classifier"]:
        n_estimators = int(params.get("n_estimators", 100))
        max_depth = params.get("max_depth", None)
        if max_depth is not None:
            max_depth = int(max_depth)
        criterion = params.get("criterion", "gini")
        min_samples_split = int(params.get("min_samples_split", 2))
        return RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            criterion=criterion,
            min_samples_split=min_samples_split,
            random_state=random_state
        )

    elif name_clean in ["support vector machine", "svm", "svc"]:
        c_val = float(params.get("C", 1.0))
        kernel = params.get("kernel", "rbf")
        gamma = params.get("gamma", "scale")
        probability = True # Required for ROC-AUC
        return SVC(
            C=c_val,
            kernel=kernel,
            gamma=gamma,
            probability=probability,
            random_state=random_state
        )

    elif name_clean in ["k-nearest neighbors", "knn", "k_nearest_neighbors"]:
        n_neighbors = int(params.get("n_neighbors", 5))
        weights = params.get("weights", "uniform")
        metric = params.get("metric", "minkowski")
        return KNeighborsClassifier(
            n_neighbors=n_neighbors,
            weights=weights,
            metric=metric
        )

    elif name_clean in ["decision tree", "decision_tree", "dt", "decision tree classifier"]:
        criterion = params.get("criterion", "gini")
        max_depth = params.get("max_depth", None)
        if max_depth is not None:
            max_depth = int(max_depth)
        min_samples_split = int(params.get("min_samples_split", 2))
        return DecisionTreeClassifier(
            criterion=criterion,
            max_depth=max_depth,
            min_samples_split=min_samples_split,
            random_state=random_state
        )

    elif name_clean in ["gradient boosting", "gradient_boosting", "gb", "gradient boosting classifier"]:
        n_estimators = int(params.get("n_estimators", 100))
        learning_rate = float(params.get("learning_rate", 0.1))
        max_depth = int(params.get("max_depth", 3))
        return GradientBoostingClassifier(
            n_estimators=n_estimators,
            learning_rate=learning_rate,
            max_depth=max_depth,
            random_state=random_state
        )

    else:
        raise ValueError(f"Unsupported traditional ML model: {model_name}")
