import math
import unittest

from diagnostics.wind import bulk_shear, interpolate_wind, storm_relative_helicity


class WindDiagnosticsTests(unittest.TestCase):
    def setUp(self):
        self.z = [0.0, 1000.0, 3000.0, 6000.0]
        self.u = [0.0, 5.0, 15.0, 25.0]
        self.v = [0.0, 2.0, 6.0, 8.0]

    def test_interpolation(self):
        self.assertAlmostEqual(interpolate_wind(self.z, self.u, 2000.0), 10.0)

    def test_six_km_bulk_shear(self):
        result = bulk_shear(self.z, self.u, self.v)
        self.assertAlmostEqual(result["du_ms"], 25.0)
        self.assertAlmostEqual(result["dv_ms"], 8.0)
        self.assertAlmostEqual(result["magnitude_ms"], math.hypot(25.0, 8.0))

    def test_srh_constant_storm_motion_is_finite(self):
        value = storm_relative_helicity(
            self.z, self.u, self.v, storm_u_ms=5.0, storm_v_ms=1.0
        )
        self.assertTrue(math.isfinite(value))

    def test_rejects_unsorted_heights(self):
        with self.assertRaises(ValueError):
            bulk_shear([0.0, 3000.0, 1000.0], [0.0, 1.0, 2.0],
                       [0.0, 1.0, 2.0])

    def test_rejects_layer_outside_profile(self):
        with self.assertRaises(ValueError):
            bulk_shear(self.z, self.u, self.v, top_m=9000.0)


if __name__ == "__main__":
    unittest.main()
