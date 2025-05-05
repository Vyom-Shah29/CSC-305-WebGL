var canvas;
var gl;
var program;

// Camera and projection parameters
var near = 0.1;
var far = 200.0;

// Lighting & Material
var lightAmbient  = vec4(0.5, 0.5, 0.5, 1.0);
var lightDiffuse  = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);
var lightPosition = vec4(0.0, 30.0, 0.0, 1.0);
var materialShininess = 10.0;

// Used when calling setColor(...)
var ambientProduct, diffuseProduct, specularProduct;

// Matrices & Camera
var modelMatrix, viewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;

var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var MS = []; // stack
var prevTime = 0.0;
var dt = 0.0;

// Position of the jellyfish in world space (near the orb at [0,8,0])
var jellyPos = [3, 8, 0];

// Global variables for space human
var spaceHumanAngle = 0;
var space_humanSuitColor  = vec4(0.0, 0.0, 1.0, 1.0);  // Blue
var space_humanBootColor  = vec4(1.0, 0.0, 0.0, 1.0);  // Red
var space_humanHeadColor  = vec4(1.0, 0.8, 0.6, 1.0);  // Flesh tone

var space_humanPosition = [1, 1, 0];         // Starting position of the space human
var space_humanMovement = [0, 0, 0];         // Additional movement offset (if animated)
var space_humanRotation = [90, 0, 0];         // Rotation angles for the space human
var space_humanHeadPosition = [0, 1.15, 0];  // Position offset for the head relative to the body


var spaceHumanArmRotation    = [180, 0, 0];
var spaceHumanLegRotation    = [0, 0, 0];
var spaceHumanArmPosition    = [0.55, 0.3, 0];
var spaceHumanThighPosition  = [0.3, -1, 0];
var spaceHumanLegCompression = [0, 0, 0];

var currentPhase = 1; // 1 = normal orbit; 2 = collision sequence
var jellyDead = false;
var orbDead = false;
var chaseSpeed = 0.01;

// Define positions for collision checks
var orbPosition = [0, 8, 0];  // where the orb is placed (above temple)

// We'll switch between 0 (no texture) and 1 (use texture).
var useTextures = 1;

// Checkerboard data (optional)
var texSize = 8;
var imageCheckerBoardData = [];
for (var i = 0; i < texSize; i++) {
    imageCheckerBoardData[i] = [];
    for (var j = 0; j < texSize; j++) {
        imageCheckerBoardData[i][j] = new Float32Array(4);
    }
}
for (var i = 0; i < texSize; i++) {
    for (var j = 0; j < texSize; j++) {
        var c = (i + j) % 2;
        imageCheckerBoardData[i][j] = [c, c, c, 1];
    }
}
var imageCheckerboard = new Uint8Array(4 * texSize * texSize);
for (var i = 0; i < texSize; i++) {
    for (var j = 0; j < texSize; j++) {
        for (var k = 0; k < 4; k++) {
            imageCheckerboard[4 * texSize * i + 4 * j + k] =
                255 * imageCheckerBoardData[i][j][k];
        }
    }
}

// All textures
var textureArray = [];

// ------------------- Lighting -------------------

function setColor(c) {
    ambientProduct  = mult(lightAmbient,  c);
    diffuseProduct  = mult(lightDiffuse,  c);
    specularProduct = mult(lightSpecular, vec4(0.4, 0.4, 0.4, 1.0));

    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"),  flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"),  flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"),   flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"),        materialShininess);
}

// ------------------- Texture Loading -------------------

function loadFileTexture(tex, filename) {
    tex.textureWebGL = gl.createTexture();
    tex.image = new Image();
    tex.image.src = filename;
    tex.isTextureReady = false;
    tex.image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, tex.textureWebGL);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
                      gl.UNSIGNED_BYTE, tex.image);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);

        gl.bindTexture(gl.TEXTURE_2D, null);
        tex.isTextureReady = true;
        console.log(filename + " loaded!");
    }
    console.log("Loading " + filename + " ...");
}

function loadImageTexture(tex, imageData) {
    tex.textureWebGL = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex.textureWebGL);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0,
                  gl.RGBA, gl.UNSIGNED_BYTE, imageData);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,     gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,     gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.bindTexture(gl.TEXTURE_2D, null);
    tex.isTextureReady = true;
}

function waitForTextures(texs) {
    setTimeout(function() {
        var loadedCount = 0;
        for (var i = 0; i < texs.length; i++) {
            if (texs[i].isTextureReady) loadedCount++;
        }
        if (loadedCount != texs.length) {
            waitForTextures(texs);
        } else {
            console.log("All textures loaded, starting render...");
            render(0);
        }
    }, 100);
}

// ------------------- WebGL Init -------------------

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Geometry
    Cube.init(program);
    Cylinder.init(20, program);
    Cone.init(20, program);
    Sphere.init(36, program);

    // Uniform locations
    modelViewMatrixLoc  = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    normalMatrixLoc     = gl.getUniformLocation(program, "normalMatrix");

    // Load textures
    textureArray.push({}); // 0: box
    loadFileTexture(textureArray[0], "box.png");

    textureArray.push({}); // 1: checkerboard
    loadImageTexture(textureArray[1], imageCheckerboard);

    textureArray.push({}); // 2: water
    loadFileTexture(textureArray[2], "water.jpg");
	
	textureArray.push({});
    loadFileTexture(textureArray[textureArray.length - 1], "orb.png");

    // Use textures by default
    gl.uniform1i(gl.getUniformLocation(program, "useTextures"), useTextures);
    setColor(vec4(1.0, 0.8, 0.0, 1.0));

    waitForTextures(textureArray);
};

// ------------------- Matrix Utilities -------------------

function setAllMatrices() {
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
    var modelViewMatrix = mult(viewMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    var normalMatrix = inverseTranspose(modelViewMatrix);
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix));
}

function gPush() {
    MS.push(modelMatrix);
}
function gPop() {
    modelMatrix = MS.pop();
}
function gTranslate(x, y, z) {
    modelMatrix = mult(modelMatrix, translate([x, y, z]));
}
function gRotate(angle, x, y, z) {
    modelMatrix = mult(modelMatrix, rotate(angle, [x, y, z]));
}
function gScale(sx, sy, sz) {
    modelMatrix = mult(modelMatrix, scale(sx, sy, sz));
}

// ------------------- Draw Helpers -------------------

function drawCube() {
    setAllMatrices();
    Cube.draw();
}
function drawSphere() {
    setAllMatrices();
    Sphere.draw();
}
function drawCylinder() {
    setAllMatrices();
    Cylinder.draw();
}
function drawCone() {
    setAllMatrices();
    Cone.draw();
}

// ------------------- Scene Objects -------------------

function drawTemple() {
    gPush();
        // --- Layer 1 ---
        gPush();
            gScale(4, 1, 4);
            drawCube();
        gPop();

        // --- Layer 2 ---
        gPush();
            gTranslate(0, 1, 0); 
            gScale(3, 2, 3);    
            drawCube();
        gPop();

        // --- Layer 3 ---
        gPush();
            gTranslate(0, 3, 0); 
            gScale(2, 1, 2);    
            drawCube();
        gPop();

        // --- Layer 4 ---
        gPush();
            gTranslate(0, 4, 0); 
            gScale(1.5, 1, 1.5);
			setColor(vec4(0.75, 0.75, 0.75, 1.0));
            drawCube();
        gPop();

        // --- Cone (roof) ---
        gPush();
            gTranslate(0, 5.8, 0);
            gRotate(-90, 1, 0, 0); 
            gScale(1.5, 1.5, 1.5);
            gl.uniform1i(gl.getUniformLocation(program, "blendTextures"), 0);
            setColor(vec4(0.75, 0.75, 0.75, 1.0));
            drawCone();
        gPop();
    gPop();
}

function renderSpaceHumanArms(isLeft) {
    gPush();
    {
        // Position & rotation
        if (isLeft) {
            // Left arm
            gTranslate(spaceHumanArmPosition[0], spaceHumanArmPosition[1], spaceHumanArmPosition[2]);
            gRotate(spaceHumanArmRotation[2], 0, 0, 1);
            gRotate(-spaceHumanArmRotation[0], 1, 0, 0);
        } else {
            // Right arm
            gTranslate(-spaceHumanArmPosition[0], spaceHumanArmPosition[1], spaceHumanArmPosition[2]);
            gRotate(-spaceHumanArmRotation[2], 0, 0, 1);
            gRotate(-spaceHumanArmRotation[0], 1, 0, 0);
        }
        // Upper arm
        gPush();
            gScale(0.1, 0.3, 0.2);
            drawCube();
        gPop();
        // Forearm
        gPush();
            gTranslate(0.0, -0.5, 0.0);
            gScale(0.1, 0.3, 0.2);
            drawCube();
        gPop();
    }
    gPop();
}

//
// Example legs: each leg has two segments (thigh & shin) plus a foot
//
function renderSpaceHumanLeg(isLeft) {
    gPush();
    {
        // Position & rotation
        if (isLeft) {
            // Left leg
            gTranslate(-spaceHumanThighPosition[0], spaceHumanThighPosition[1], spaceHumanThighPosition[2]);
            gRotate(-spaceHumanLegRotation[0], 1, 0, 0);
        } else {
            // Right leg
            gTranslate(spaceHumanThighPosition[0], spaceHumanThighPosition[1], spaceHumanThighPosition[2]);
            gRotate(spaceHumanLegRotation[0], 1, 0, 0);
        }
        // Thigh
        gPush();
            gScale(0.1, 0.5, 0.2);
            drawCube();
        gPop();
        // Shin
        gPush();
            gTranslate(0, -0.375, 0);
            gRotate(spaceHumanLegCompression[0], 1, 0, 0); // Bend at the knee
            gTranslate(0, -0.375, 0);
            gScale(0.1, 0.4, 0.2);
            drawCube();
            // Foot
            gPush();
                gTranslate(0, -0.9, 1);
                gScale(1, 0.15, 1.4);
                drawCube();
            gPop();
        gPop();
    }
    gPop();
}

function renderSpaceHumanArms(isLeft) {
    gPush();
    {
        setColor(space_humanSuitColor);
        if (isLeft) {
            gTranslate(spaceHumanArmPosition[0], spaceHumanArmPosition[1], spaceHumanArmPosition[2]);
            gRotate(spaceHumanArmRotation[2], 0, 0, 1);
            gRotate(-spaceHumanArmRotation[0], 1, 0, 0);
        } else {
            gTranslate(-spaceHumanArmPosition[0], spaceHumanArmPosition[1], spaceHumanArmPosition[2]);
            gRotate(-spaceHumanArmRotation[2], 0, 0, 1);
            gRotate(-spaceHumanArmRotation[0], 1, 0, 0);
        }
        // Upper arm
        gPush();
            gScale(0.1, 0.3, 0.2);
            drawCube();
        gPop();
        // Forearm
        gPush();
            gTranslate(0.0, -0.5, 0.0);
            gScale(0.1, 0.3, 0.2);
            drawCube();
        gPop();
    }
    gPop();
}

// Draw legs with red boots
function renderSpaceHumanLeg(isLeft) {
    gPush();
    {
        // Thigh + shin in blue
        setColor(space_humanSuitColor);
        if (isLeft) {
            gTranslate(-spaceHumanThighPosition[0], spaceHumanThighPosition[1], spaceHumanThighPosition[2]);
            gRotate(-spaceHumanLegRotation[0], 1, 0, 0);
        } else {
            gTranslate(spaceHumanThighPosition[0], spaceHumanThighPosition[1], spaceHumanThighPosition[2]);
            gRotate(spaceHumanLegRotation[0], 1, 0, 0);
        }
        // Thigh
        gPush();
            gScale(0.1, 0.5, 0.2);
            drawCube();
        gPop();
        // Shin
        gPush();
            gTranslate(0, -0.375, 0);
            gRotate(spaceHumanLegCompression[0], 1, 0, 0); 
            gTranslate(0, -0.375, 0);
            gScale(0.1, 0.4, 0.2);
            drawCube();
        gPop();

        // Foot (boots) in red
        setColor(space_humanBootColor);
        gPush();
            gTranslate(0, -1.0, 0.3);
            gScale(0.08, 0.08, 0.1);
            drawCube();
        gPop();
    }
    gPop();
}

function renderSpaceHuman() {
    gl.uniform1i(gl.getUniformLocation(program, "blendTextures"), 0);

    gPush();
        // Translate + rotate the entire space human
        gTranslate(space_humanPosition[0], space_humanPosition[1], space_humanPosition[2]);
        gTranslate(space_humanMovement[0], space_humanMovement[1], space_humanMovement[2]);
        gRotate(space_humanRotation[0], 1, 0, 0);
        gRotate(space_humanRotation[1], 0, 1, 0);
        gRotate(space_humanRotation[2], 0, 0, 1);

        // Body (blue)
        setColor(space_humanSuitColor);
        gPush();
            gScale(0.4, 0.8, 0.5);
            drawCube();
        gPop();

        // Arms (blue)
        renderSpaceHumanArms(false); // Right arm
        renderSpaceHumanArms(true);  // Left arm

        // Legs (blue thighs, red boots)
        renderSpaceHumanLeg(false);  // Right leg
        renderSpaceHumanLeg(true);   // Left leg

        // Head (flesh color)
        setColor(space_humanHeadColor);
        gPush();
            gTranslate(space_humanHeadPosition[0], space_humanHeadPosition[1], space_humanHeadPosition[2]);
            gScale(0.333, 0.333, 0.333);
            drawSphere();
        gPop();
    gPop();
}

function renderOrb(timestamp) {
    gPush();
        // UPDATED: Enable texturing for the orb by setting blendTextures to 1.
        gl.uniform1i(gl.getUniformLocation(program, "blendTextures"), 1);
        if (textureArray[3] && textureArray[3].isTextureReady) {  // UPDATED: Using orb texture (assumed index 3)
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, textureArray[3].textureWebGL);
            gl.uniform1i(gl.getUniformLocation(program, "texture1"), 0);
        }
        
        // Position the orb above the temple cone.
        gTranslate(0, 8, 0);
        // Optional: pulsating glow effect.
        var scaleFactor = 0.5 + 0.1 * Math.abs(Math.sin(timestamp * 0.005));
        gScale(scaleFactor, scaleFactor, scaleFactor);
        
        setColor(vec4(0.0, 1.0, 0.0, 1.0));
        
        drawSphere();
    gPop();
}
// Draw a static jellyfish body and tentacles
function renderJellyfish(timestamp) {
    // Disable texturing for the jellyfish
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.uniform1i(gl.getUniformLocation(program, "blendTextures"), 0);

    gPush();
        // Set jellyfish color (pinkish)
        setColor(vec4(0.9, 0.2, 0.6, 1.0));

        // UPDATED: Compute an orbit position for the jellyfish
        var jellyOrbitRadius = 4; // Adjust radius as needed
        var jellyAngle = timestamp * 0.0001; // Speed of orbit (adjust as needed)
        var bobbing = 0.2 * Math.sin(timestamp * 0.005); // Vertical bobbing effect
        var jellyX = jellyOrbitRadius * Math.cos(jellyAngle);
        var jellyZ = jellyOrbitRadius * Math.sin(jellyAngle);
        // Position the jellyfish at computed orbit, at y ~8 plus bobbing
        gTranslate(jellyX, 8 + bobbing, jellyZ);

        // Rotate the bell so it faces upward (depending on your model orientation)
        gRotate(90, 1, 0, 0);

        // Draw the bell (a flattened sphere)
        gPush();
            gScale(1.0, 0.5, 1.0);
            drawSphere();
        gPop();

        // Move downward for tentacles to attach
        gTranslate(0, -0.5, 0);
        // Draw 12 tentacles evenly around the bell
        for (var i = 0; i < 12; i++) {
            var angle = (360 / 12) * i;
            renderTentacle(angle, timestamp);
        }
    gPop();
}


function renderTentacle(angle, timestamp) {
    gPush();
        // Rotate around the Y-axis to evenly space the tentacles
        gRotate(angle, 0, 1, 0);
        // Add a horizontal offset that oscillates over time for a wavy base position
        var waveOffset = 0.1 * Math.sin(timestamp * 0.005 + angle);
        gTranslate(0.4 + waveOffset, 0, 0);
        // Draw 5 segments to form the tentacle
        for (var i = 0; i < 5; i++) {
            gPush();
                // Move each segment downward
                gTranslate(0, -i * 0.25, 0);
                // Apply a small rotation oscillation for a wavy motion in each segment
                var segRotation = 5 * Math.sin(timestamp * 0.01 + i);
                gRotate(segRotation, 0, 0, 1);
                gScale(0.05, 0.15, 0.05);
                drawSphere();
            gPop();
        }
    gPop();
}

function approachTarget(targetPos, speed) {
    // dx, dy, dz is the vector from the human to the target
    var dx = targetPos[0] - space_humanPosition[0];
    var dy = targetPos[1] - space_humanPosition[1];
    var dz = targetPos[2] - space_humanPosition[2];
    // Move the human a fraction of that vector
    space_humanPosition[0] += dx * speed;
    space_humanPosition[1] += dy * speed;
    space_humanPosition[2] += dz * speed;
    // Return the distance to see if it's < threshold
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
}


// ------------------- Render Loop -------------------

function render(timestamp) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // NEW: Switch to chase sequence after 20 seconds
    if (timestamp > 35000) {
        currentPhase = 2;
    }

    // UPDATED: Phase-based camera
    if (currentPhase === 1) {
        // Phase 1: normal orbit camera
        var orbitRadius = 20;
        var camAngle = timestamp * 0.0003;
        eye = vec3(
            orbitRadius * Math.cos(camAngle),
            10,
            orbitRadius * Math.sin(camAngle)
        );
        at = vec3(0, 1.5, 0);
    } else {
        // Phase 2: freeze camera
        eye = vec3(0, 10, 20);
        at = vec3(0, 1.5, 0);
    }

    projectionMatrix = perspective(45, canvas.width / canvas.height, near, far);
    viewMatrix = lookAt(eye, at, up);

    modelMatrix = mat4();
    MS = [];

    // Draw Temple (solid golden)
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.uniform1i(gl.getUniformLocation(program, "blendTextures"), 0);
    setColor(vec4(1.0, 0.84, 0.0, 1.0));
    drawTemple();

    // Draw Water (with texture)
    gl.uniform1i(gl.getUniformLocation(program, "blendTextures"), 1);
    if (textureArray[2].isTextureReady) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureArray[2].textureWebGL);
        gl.uniform1i(gl.getUniformLocation(program, "texture1"), 0);
    }
    setColor(vec4(1.0, 1.0, 1.0, 1.0));
    gPush();
        gTranslate(0, -1, 0);
        gScale(50, 0.1, 50);
        drawCube();
    gPop();

    renderOrb(timestamp);

    // UPDATED: Human movement depends on phase
    if (currentPhase === 1) {
        // Normal orbit
        var humanOrbitRadius = 7.5;
        var humanAngle = timestamp * 0.0005;
        space_humanPosition[0] = humanOrbitRadius * Math.cos(humanAngle);
        space_humanPosition[1] = 2 + 0.5 * Math.sin(2 * humanAngle);
        space_humanPosition[2] = humanOrbitRadius * Math.sin(humanAngle);
    } else {
        // Phase 2: chase jellyfish first, then orb
        if (!jellyDead) {
            var dist = approachTarget(jellyFishPosition, chaseSpeed);
            if (dist < 0.5) {
                jellyDead = true;
            }
        } else if (!orbDead) {
            var dist2 = approachTarget(orbPosition, chaseSpeed);
            if (dist2 < 0.5) {
                orbDead = true;
            }
        }
    }

    // Draw the Space Human
    renderSpaceHuman();

    // Only draw the jellyfish if it's not "dead"
    if (!jellyDead) {
        renderJellyfish(timestamp);
    }

    // Only draw the orb if it's not "dead"
    if (!orbDead) {
        renderOrb(timestamp);
    }

    window.requestAnimFrame(render);
}
