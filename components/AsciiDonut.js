import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from '../styles/Home.module.css'; // Or a new CSS module if preferred

const AsciiDonut = () => {
  const [donutOutput, setDonutOutput] = useState('');
  const animationFrameId = useRef(null);

  // These refs store the main animation angles, corresponding to:
  // float a=0,e=1,c=1,d=0; in the C code, where 'a' and 'd' are sines, 'e' and 'c' are cosines.
  const rot1_sin_A = useRef(0); // C variable 'a'
  const rot1_cos_E = useRef(1); // C variable 'e'
  const rot2_sin_D = useRef(0); // C variable 'd'
  const rot2_cos_C = useRef(1); // C variable 'c'

  // Memoized rotation function for the main animation angles (which are refs)
  const rotateMainAngles = useCallback((tanTheta, cosRef, sinRef) => {
    let f_temp; // Temporary variable like 'f' in the C macro
    let x = cosRef.current;
    let y = sinRef.current;

    f_temp = x;
    x -= tanTheta * y;
    y += tanTheta * f_temp;

    f_temp = (3 - x * x - y * y) / 2; // Renormalization step
    x *= f_temp;
    y *= f_temp;

    cosRef.current = x;
    sinRef.current = y;
  }, []);

  // Utility rotation function for local loop variables (sines/cosines for torus angles)
  // This one takes current values and returns new values, does not mutate refs.
  const utilRotateLocal = useCallback((tanTheta, currentCos, currentSin) => {
    let f_temp;
    let x = currentCos;
    let y = currentSin;

    f_temp = x;
    x -= tanTheta * y;
    y += tanTheta * f_temp;

    f_temp = (3 - x * x - y * y) / 2; // Renormalization
    x *= f_temp;
    y *= f_temp;

    return { cos: x, sin: y };
  }, []);

  // Buffers for characters and z-depth, using useRef to persist across renders
  const b_charBuffer = useRef(Array(1760).fill(' ')).current;
  const z_depthBuffer = useRef(Array(1760).fill(0.0)).current;

  useEffect(() => {
    const animate = () => {
      // Clear buffers at the start of each frame
      b_charBuffer.fill(' '); // Fill character buffer with spaces
      z_depthBuffer.fill(0.0);  // Fill z-buffer with 0.0

      // Variables for torus geometry and projection
      // g_sin_j, h_cos_j: sine and cosine for the angle around the major circle of the torus (j loop)
      let g_sin_j = 0.0; // Corresponds to 'g' in C (sine part of major rotation)
      let h_cos_j = 1.0; // Corresponds to 'h' in C (cosine part of major rotation)

      // Loop for the major circle of the torus (angle j in C code, 0 to <90)
      for (let j_loop = 0; j_loop < 90; j_loop++) {
        // G_sin_i, H_cos_i: sine and cosine for the angle around the minor circle (tube) of the torus (i loop)
        let G_sin_i = 0.0; // Corresponds to 'G' in C (sine part of minor rotation)
        let H_cos_i = 1.0; // Corresponds to 'H' in C (cosine part of minor rotation)

        // Loop for the minor circle of the torus (angle i in C code, 0 to <314)
        for (let i_loop = 0; i_loop < 314; i_loop++) {
          // Precompute some values (A_calc, D_calc, t_calc from C code)
          const A_calc = h_cos_j + 2;
          const D_calc_inv = (G_sin_i * A_calc * rot1_sin_A.current + g_sin_j * rot1_cos_E.current + 5);

          if (D_calc_inv === 0) continue; // Avoid division by zero if it ever happens
          const D_calc = 1 / D_calc_inv;

          const t_calc = G_sin_i * A_calc * rot1_cos_E.current - g_sin_j * rot1_sin_A.current;

          // Calculate 2D screen coordinates (x, y)
          const x = Math.floor(40 + 30 * D_calc * (H_cos_i * A_calc * rot2_sin_D.current - t_calc * rot2_cos_C.current));
          const y = Math.floor(12 + 15 * D_calc * (H_cos_i * A_calc * rot2_cos_C.current + t_calc * rot2_sin_D.current));

          // Calculate linear offset for buffers
          const o = x + 80 * y;

          // Calculate luminance (N_calc from C code)
          const N_val = 8 * ((g_sin_j * rot1_sin_A.current - G_sin_i * h_cos_j * rot1_cos_E.current) * rot2_sin_D.current - G_sin_i * h_cos_j * rot1_sin_A.current - g_sin_j * rot1_cos_E.current - H_cos_i * h_cos_j * rot2_cos_C.current);
          const N_calc = Math.floor(N_val);

          // Z-buffer check and character assignment
          if (y >= 0 && y < 22 && x >= 0 && x < 80 && D_calc > z_depthBuffer[o]) {
            z_depthBuffer[o] = D_calc;
            const luminanceChars = ".,-~:;=!*#$@";
            // Clamp index to be within bounds of luminanceChars
            const charIndex = Math.max(0, Math.min(N_calc, luminanceChars.length - 1));
            b_charBuffer[o] = luminanceChars[charIndex];
          }

          // Rotate angles for the minor circle
          let rot_i_result = utilRotateLocal(0.02, H_cos_i, G_sin_i);
          H_cos_i = rot_i_result.cos;
          G_sin_i = rot_i_result.sin;
        }

        // Rotate angles for the major circle
        let rot_j_result = utilRotateLocal(0.07, h_cos_j, g_sin_j);
        h_cos_j = rot_j_result.cos;
        g_sin_j = rot_j_result.sin;
      }

      // Format the character buffer into a display string
      let outputString = "";
      for (let k = 0; k < 1760; k++) {
        outputString += b_charBuffer[k];
        if ((k + 1) % 80 === 0 && k < 1759) { // Add newline after every 80 characters, but not for the very last char
          outputString += "\n";
        }
      }
      setDonutOutput(outputString);

      // Update main animation view angles
      rotateMainAngles(0.01, rot1_cos_E, rot1_sin_A);
      rotateMainAngles(0.005, rot2_cos_C, rot2_sin_D);

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [rotateMainAngles, b_charBuffer, z_depthBuffer, utilRotateLocal]); // Added utilRotateLocal to dependencies

  return (
    <div className={styles.donutContainer}> {/* Optional: for specific container styling */}
      <pre id="donutPre" style={{fontSize: '10px', lineHeight: '1.0', letterSpacing: '0.5px', margin: '20px 0'}}>
        {/* Added margin for spacing */}
        {donutOutput}
      </pre>
    </div>
  );
};

export default AsciiDonut;
