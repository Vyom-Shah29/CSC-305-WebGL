#!/usr/bin/env python3


"""
RayTracer.py –
Usage
-----
$ python RayTracer.py  scene.txt
All required external deps: `pip install numpy`.
"""


import sys
from pathlib import Path
from typing import List, Tuple, Optional
import numpy as np

# Utility math


def normalize(v: np.ndarray) -> np.ndarray:
    """Return v / ||v||, guarding against zero length."""
    n = np.linalg.norm(v)
    if n == 0:
        return v.copy()
    return v / n

def reflect(I: np.ndarray, N: np.ndarray) -> np.ndarray:
    """Reflect vector I around normal N (assumes N is normalized)."""
    return I - 2.0 * np.dot(I, N) * N

def clamp01(x: np.ndarray) -> np.ndarray:
    return np.clip(x, 0.0, 1.0)


# Data structure


class Sphere:
    __slots__ = (
        "name",
        "M",
        "M_inv",
        "M_invT",
        "color",
        "Ka",
        "Kd",
        "Ks",
        "Kr",
        "spec_exp",
    )

    def __init__(
        self,
        name: str,
        pos: Tuple[float, float, float],
        scl: Tuple[float, float, float],
        color: Tuple[float, float, float],
        ka: float,
        kd: float,
        ks: float,
        kr: float,
        n: int,
    ) -> None:
        self.name = name
        # Model matrix = T * S (no rotation required)
        T = np.eye(4)
        T[:3, 3] = pos
        S = np.diag([*scl, 1.0])
        self.M = T @ S
        self.M_inv = np.linalg.inv(self.M)
        self.M_invT = self.M_inv.T
        self.color = np.array(color, dtype=np.float64)
        self.Ka, self.Kd, self.Ks, self.Kr = ka, kd, ks, kr
        self.spec_exp = n

    # ---------------------------------------------------------------------
    def intersect(self, ro: np.ndarray, rd: np.ndarray) -> Optional[Tuple[float, np.ndarray, np.ndarray]]:
        """Return (t, hitPoint, normal) in world space for the *nearest* valid hit, or None."""
        # Transform ray to object space (unit sphere)
        ro_h = np.append(ro, 1.0)
        rd_h = np.append(rd, 0.0)
        ro_obj = self.M_inv @ ro_h
        rd_obj = self.M_inv @ rd_h
        ro_obj = ro_obj[:3]
        rd_obj = rd_obj[:3]

        # Quadratic: ||ro + t*rd||^2 = 1

        a = np.dot(rd_obj, rd_obj)
        b = 2.0 * np.dot(ro_obj, rd_obj)
        c = np.dot(ro_obj, ro_obj) - 1.0
        disc = b * b - 4 * a * c
        if disc < 0:
            return None
        sqrt_disc = np.sqrt(disc)
        t0 = (-b - sqrt_disc) / (2 * a)
        t1 = (-b + sqrt_disc) / (2 * a)
        t_obj = None
        for t in (t0, t1):
            if t > 1.0:  # must be in front of near plane (spec requirement)
                t_obj = t
                break
        if t_obj is None:
            return None
        # Hit point & normal in object space
        p_obj = ro_obj + t_obj * rd_obj
        n_obj = normalize(p_obj)
        # Transform back to world space
        p_world_h = self.M @ np.append(p_obj, 1.0)
        p_world = p_world_h[:3]
        # Normal: use inverse‑transpose
        n_world_h = self.M_invT @ np.append(n_obj, 0.0)
        n_world = normalize(n_world_h[:3])
        # Compute t in world space (distance along original ray)
        t_world = np.linalg.norm(p_world - ro)
        return t_world, p_world, n_world


class Light:
    __slots__ = ("name", "pos", "intensity")

    def __init__(self, name: str, pos: Tuple[float, float, float], intensity: Tuple[float, float, float]):
        self.name = name
        self.pos = np.array(pos, dtype=np.float64)
        self.intensity = np.array(intensity, dtype=np.float64)


class Scene:
    """Holds everything parsed from the scene file."""

    def __init__(self):
        # Camera/frustum
        self.near = None
        self.left = self.right = self.top = self.bottom = None
        self.nx = self.ny = None
        # Global
        self.background = np.zeros(3)
        self.ambient = np.zeros(3)
        # Objects & lights
        self.spheres: List[Sphere] = []
        self.lights: List[Light] = []
        # Output name
        self.out_name = "output.ppm"

    # ------------------------------------------------------------------
    def parse(self, path: Path):
        tokens = {
            "NEAR": self._parse_near,
            "LEFT": self._parse_left,
            "RIGHT": self._parse_right,
            "BOTTOM": self._parse_bottom,
            "TOP": self._parse_top,
            "RES": self._parse_res,
            "SPHERE": self._parse_sphere,
            "LIGHT": self._parse_light,
            "BACK": self._parse_back,
            "AMBIENT": self._parse_ambient,
            "OUTPUT": self._parse_output,
        }
        with path.open() as f:
            for raw_line in f:
                line = raw_line.strip()
                if not line or line.startswith("//"):
                    continue
                parts = line.split()
                key = parts[0].upper()
                if key not in tokens:
                    raise ValueError(f"Unknown token {key} in scene file")
                tokens[key](parts[1:])

        # Minimal validation
        assert self.near is not None and self.nx is not None and self.lights and self.spheres, "Scene missing required fields"

    # ---------- individual token handlers ----------
    def _parse_near(self, vals):
        self.near = float(vals[0])

    def _parse_left(self, vals):
        self.left = float(vals[0])

    def _parse_right(self, vals):
        self.right = float(vals[0])

    def _parse_bottom(self, vals):
        self.bottom = float(vals[0])

    def _parse_top(self, vals):
        self.top = float(vals[0])

    def _parse_res(self, vals):
        self.nx, self.ny = int(vals[0]), int(vals[1])

    def _parse_sphere(self, vals):
        name = vals[0]
        pos = tuple(map(float, vals[1:4]))
        scl = tuple(map(float, vals[4:7]))
        color = tuple(map(float, vals[7:10]))
        ka, kd, ks, kr = map(float, vals[10:14])
        n = int(vals[14])
        self.spheres.append(Sphere(name, pos, scl, color, ka, kd, ks, kr, n))

    def _parse_light(self, vals):
        name = vals[0]
        pos = tuple(map(float, vals[1:4]))
        intensity = tuple(map(float, vals[4:7]))
        self.lights.append(Light(name, pos, intensity))

    def _parse_back(self, vals):
        self.background = np.array(list(map(float, vals[0:3])))

    def _parse_ambient(self, vals):
        self.ambient = np.array(list(map(float, vals[0:3])))

    def _parse_output(self, vals):
        self.out_name = vals[0][:20]



# Ray tracer core

class RayTracer:
    MAX_DEPTH = 3
    EPS = 1e-4

    def __init__(self, scene: Scene):
        self.scene = scene

    # ------------------------------------------------------------------
    def trace(self, ro: np.ndarray, rd: np.ndarray, depth: int = 0) -> np.ndarray:
        hit_obj, hit_t, hit_p, hit_n = self._closest_hit(ro, rd)
        if hit_obj is None:
            return self.scene.background if depth == 0 else np.zeros(3)

        # Local illumination
        obj = hit_obj
        color = obj.Ka * self.scene.ambient * obj.color

        view_dir = normalize(-rd)
        for light in self.scene.lights:
            # Shadow test
            to_light = light.pos - hit_p
            dist_light = np.linalg.norm(to_light)
            L = normalize(to_light)
            if self._in_shadow(hit_p, L, dist_light):
                continue
            NdotL = max(0.0, np.dot(hit_n, L))
            diffuse = obj.Kd * light.intensity * NdotL * obj.color
            # Specular
            R = reflect(-L, hit_n)
            RdotV = max(0.0, np.dot(R, view_dir))
            specular = obj.Ks * light.intensity * (RdotV ** obj.spec_exp)
            color += diffuse + specular

        # Reflection
        if depth < self.MAX_DEPTH and obj.Kr > 0.0:
            refl_dir = reflect(rd, hit_n)
            refl_origin = hit_p + self.EPS * refl_dir
            refl_color = self.trace(refl_origin, refl_dir, depth + 1)
            color += obj.Kr * refl_color

        return clamp01(color)

    # ------------------------------------------------------------------
    def _closest_hit(self, ro: np.ndarray, rd: np.ndarray):
        closest_t = float("inf")
        hit_obj = None
        hit_p = hit_n = None
        for sph in self.scene.spheres:
            res = sph.intersect(ro, rd)
            if res is None:
                continue
            t, p, n = res
            if t < closest_t:
                closest_t = t
                hit_obj, hit_p, hit_n = sph, p, n
        return hit_obj, closest_t, hit_p, hit_n

    # ------------------------------------------------------------------
    def _in_shadow(self, origin: np.ndarray, L: np.ndarray, max_dist: float) -> bool:
        shadow_origin = origin + self.EPS * L
        for sph in self.scene.spheres:
            res = sph.intersect(shadow_origin, L)
            if res is None:
                continue
            t, _, _ = res
            if t < max_dist:
                return True
        return False



# PPM writer


def save_ppm_p3(width: int, height: int, fname: str, pixels: np.ndarray):
    print(f"Saving image {fname}: {width} x {height}")
    max_val = 255
    with open(fname, "w") as f:
        f.write("P3\n")
        f.write(f"{width} {height}\n")
        f.write(f"{max_val}\n")
        for j in range(height):
            row = []
            for i in range(width):
                r, g, b = pixels[j, i]
                row.append(f"{r} {g} {b}")
            f.write(" ".join(row) + "\n")


# Main program


def main():
    if len(sys.argv) != 2:
        print("Usage: python RayTracer.py <sceneFile.txt>")
        sys.exit(1)
    scene_file = Path(sys.argv[1])
    if not scene_file.exists():
        print(f"Scene file '{scene_file}' not found")
        sys.exit(1)

    scene = Scene()
    scene.parse(scene_file)
    tracer = RayTracer(scene)

    nx, ny = scene.nx, scene.ny
    pixels = np.zeros((ny, nx, 3), dtype=np.uint8)

    # Precompute constants for image plane mapping
    u_span = scene.right - scene.left
    v_span = scene.top - scene.bottom
    for j in range(ny):  # image rows (top to bottom)
        v = scene.top - v_span * (j + 0.5) / ny
        for i in range(nx):  # columns (left to right)
            u = scene.left + u_span * (i + 0.5) / nx
            pixel_pos = np.array([u, v, -scene.near])
            ray_dir = normalize(pixel_pos)
            color = tracer.trace(np.zeros(3), ray_dir)
            pixels[j, i] = (color * 255).astype(np.uint8)
        if (j % 50) == 0:
            print(f"Scanline {j+1}/{ny} done")

    save_ppm_p3(nx, ny, scene.out_name, pixels)
    print("Done.")


if __name__ == "__main__":
    main()