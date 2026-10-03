"""Generate tests/fixtures/astropy-reference.json.

Development-only script (not part of the build). It evaluates an independent
implementation of the same background model (astropy's FlatLambdaCDM with the
parameters in src/physics/params.ts, massless neutrinos) so that the
TypeScript integrator can be cross-checked.

Ages are integrated here in x = ln a with scipy, using astropy's own E(z):
astropy's built-in `age(z)` integrates in z and loses accuracy above z ~ 1000
(1.4% at z = 1e4, a factor ~36 at z = 1e5 with astropy 8.0.1).

Usage:  python3 scripts/gen-reference.py
Requires: astropy (tested with 8.0.1), numpy, scipy.
"""

import json
from pathlib import Path

import math

import astropy
import astropy.units as u
from astropy.cosmology import FlatLambdaCDM
from scipy import __version__ as scipy_version
from scipy.integrate import quad

H0 = 67.66
OMEGA_M = 0.3111
T_CMB0 = 2.7255
N_EFF = 3.046

cosmo = FlatLambdaCDM(H0=H0, Om0=OMEGA_M, Tcmb0=T_CMB0, Neff=N_EFF, m_nu=0 * u.eV)

REDSHIFTS = [0, 0.1, 0.3, 0.5, 1, 2, 3, 5, 7.82, 10, 20, 30, 100, 300, 1089.8, 3400, 1e4, 1e5]

H0_PER_SECOND = cosmo.H0.to(1 / u.s).value


def age_seconds(z: float) -> float:
    """t(z) = integral of d ln a / H from a = 0 (60 e-folds below suffice)."""
    x_end = -math.log1p(z)

    def integrand(x: float) -> float:
        return 1.0 / (H0_PER_SECOND * cosmo.efunc(math.expm1(-x)))

    value, _ = quad(integrand, x_end - 60, x_end, epsabs=0, epsrel=1e-13, limit=1000)
    return value


rows = []
for z in REDSHIFTS:
    rows.append(
        {
            "z": z,
            "ageSeconds": age_seconds(z),
            "hubblePerSecond": float(cosmo.H(z).to(1 / u.s).value),
        }
    )

out = {
    "generator": "scripts/gen-reference.py",
    "astropyVersion": astropy.__version__,
    "scipyVersion": scipy_version,
    "model": {
        "H0": H0,
        "Om0": OMEGA_M,
        "Tcmb0": T_CMB0,
        "Neff": N_EFF,
        "m_nu_eV": 0,
        "Ogamma0": float(cosmo.Ogamma0),
        "Onu0": float(cosmo.Onu0),
        "Ode0": float(cosmo.Ode0),
    },
    "rows": rows,
}

path = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "astropy-reference.json"
path.write_text(json.dumps(out, indent=2) + "\n")
print(f"wrote {path}")
