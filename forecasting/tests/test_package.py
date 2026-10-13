import importlib

import sjpt_forecasting


def test_package_version():
    assert sjpt_forecasting.__version__ == "0.1.0"


def test_forecasting_dependencies_are_installed():
    for name in ("numpy", "pandas", "statsmodels.tsa.holtwinters"):
        importlib.import_module(name)
