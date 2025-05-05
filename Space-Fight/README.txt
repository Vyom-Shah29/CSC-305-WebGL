Project Title:
Real-Time 3D Scene: Temple, Space Human, Jellyfish, and Orb Collision Animation

Overview:
A golden temple built from four cube layers and a cone roof (with a silver appearance) that demonstrates hierarchical modeling.
A water plane textured with a water image.
A glowing orb placed above the temple.
A space human (diver) that initially orbits the temple and, after a set time, moves toward a jellyfish and an orb—causing them to “disappear” when collision is detected.
A jellyfish with wavy tentacles that orbits the scene.
A 360-degree camera that orbits the scene in real-time until the collision sequence begins.

Hierarchical Object (4 Marks)
Completed.
A golden temple is constructed hierarchically with four cube layers and a cone (roof) to demonstrate joint transformations and inter-level motion.

360-Degree Camera Fly-Around (4 Marks)
Completed.
The camera orbits the scene using lookAt() and setMV(), focusing on a central point while maintaining real-time motion.

Real-Time Connection (4 Marks)
Completed.
The scene animation is driven by a real-time timestamp, ensuring one simulated second corresponds roughly to one real second.

Use of Two Meaningful Textures (6 Marks)
Completed.
The water plane is textured with a water image and the orb uses its own texture, integrated meaningfully into the scene.

Shader Conversion to Fragment Shader (5 Marks)
Maybe Partial.
The ADS lighting calculation is performed per fragment in the fragment shader, ensuring detailed per-pixel lighting.

Conversion to Blinn-Phong (2 Marks)
Not Completed.

Novel Shader Effect (5 Marks)
Partially Completed.
A pulsating effect is applied to the orb’s shader.


Complexity (5 Marks)
Partial Credit.
The scene setup, movement of animated elements, and collision sequences are there but doesn't work properly

Creativity (5 Marks)
Partial Credit.
The narrative (a space human battling a jellyfish and capturing a mystical orb) provides a creative twist, though there is room for deeper storytelling and artistic refinement.

Quality (5 Marks)
Partial Credit.

Programming Style (2 Marks)
Completed.
