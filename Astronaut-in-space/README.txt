VYOM SHAH
V00951024

CSC 305 A1

Description: 

This project renders a space scene using JavaScript and WebGL. The scene includes an animated astronaut, a space jelly creature with tentacles, and a background of moving stars.

Implemented Features: 
• Real-time animation synchronized via dt and an accumulated TIME variable. 

• Astronaut modeling with a helmet (with face shield), torso, arms, and legs. The astronaut oscillates diagonally and its arms and legs are animated using sine functions. 

• Basic arm and leg animations: arms swing and legs rotate at the hips and knees. The legs are constructed using hierarchical push/pop matrix operations. 

• Space jelly modeling using two scaled spheres for the body and several tentacle segments with a wavy motion. 

• The space jelly orbits around a point using an orbit radius and orbit angle, though its rotation is not perfectly smooth. 

• A static pool of stars is seeded randomly; the stars move diagonally and are reset when they leave the view to maintain a constant count.

Known Issues: 
• The space jelly’s rotation does not perfectly match the smooth rotation shown in the reference video. 

• The tentacles of the jelly are not moving in the same way as described in the video.

• The proportions and animations of the astronaut’s legs do not exactly mirror the video posted in the assignment description.

• The NASA patches are not visible on the astronaut.
