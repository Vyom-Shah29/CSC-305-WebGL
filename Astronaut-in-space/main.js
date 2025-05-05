
var canvas;
var gl;

var program;

var near = 1;
var far = 100;

var lightPosition2 = vec4(100.0, 100.0, 100.0, 1.0 );
var lightPosition = vec4(0.0, 0.0, 100.0, 1.0 );

var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 0.4, 0.4, 0.4, 1.0 );
var materialShininess = 30.0;

var ambientColor, diffuseColor, specularColor;

var modelMatrix, viewMatrix, modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var RX = 0;
var RY = 0;
var RZ = 0;

var MS = []; // The modeling matrix stack
var TIME = 0.0; // Realtime
var dt = 0.0
var prevTime = 0.0;
var resetTimerFlag = true;
var animFlag = false;
var controller;

// These are used to store the current state of objects.
// In animation it is often useful to think of an object as having some DOF
// Then the animation is simply evolving those DOF over time. You could very easily make a higher level object that stores these as Position, Rotation (and also Scale!)
var sphereRotation = [0,0,0];
var spherePosition = [-4,0,0];

var cubeRotation = [0,0,0];
var cubePosition = [-1,0,0];

var cylinderRotation = [0,0,0];
var cylinderPosition = [1.1,0,0];

var coneRotation = [0,0,0];
var conePosition = [3,0,0];


var left = -6.0;
var right = 6.0;
var ytop =6.0;
var bottom = -6.0;

//***********STARS***********
var NUM_STARS = 30;
var stars = [];

var minX = -6, maxX = 8;
var minY = -6, maxY = 8;

//***********JELLY***********
var jellyAngle = 0.0;
var jellyOrbitAngle = 0.0;
var jellyOrbitRadius = 5.0;
var jellyOrbitSpeed = 0.5;
var tentacleWaveFreq = 3.0;
var tentacleWaveAmp = 20.0;

// Position for astronaut’s world oscillation
var astronautPosX = 0.0;
var astronautPosY = 0.0;

// Arm angles
var leftArmAngle = 275.0;
var rightArmAngle = 80.0;

// Leg angles at hips
var leftHipAngle = 0.0;
var rightHipAngle = 0.0;

// Leg angles at knees
var leftKneeAngle = 0.0;
var rightKneeAngle = 0.0;

// We can define speeds/frequencies as well:
var oscillationAmplitudeX = 1.0;
var oscillationAmplitudeY = 0.5;
var oscillationFreq = 1.0;


// Setting the colour which is needed during illumination of a surface
function setColor(c)
{
    ambientProduct = mult(lightAmbient, c);
    diffuseProduct = mult(lightDiffuse, c);
    specularProduct = mult(lightSpecular, materialSpecular);
    
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "specularProduct"),flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
                                        "shininess"),materialShininess );
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    

    setColor(materialDiffuse);

    initStars();
	
	// Initialize some shapes, note that the curved ones are procedural which allows you to parameterize how nice they look
	// Those number will correspond to how many sides are used to "estimate" a curved surface. More = smoother
    Cube.init(program);
    Cylinder.init(20,program);
    Cone.init(20,program);
    Sphere.init(36,program);

    // Matrix uniforms
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    
    // Lighting Uniforms
    gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );


    document.getElementById("animToggleButton").onclick = function() {
        if( animFlag ) {
            animFlag = false;
        }
        else {
            animFlag = true;
            resetTimerFlag = true;
            window.requestAnimFrame(render);
        }
        //console.log(animFlag);
    };

    render(0);
}


// Sets the modelview and normal matrix in the shaders
function setMV() {
    modelViewMatrix = mult(viewMatrix,modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    normalMatrix = inverseTranspose(modelViewMatrix);
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix) );
}

// Sets the projection, modelview and normal matrix in the shaders
function setAllMatrices() {
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    setMV();   
}

// Draws a 2x2x2 cube center at the origin
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCube() {
    setMV();
    Cube.draw();
}

// Draws a sphere centered at the origin of radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawSphere() {
    setMV();
    Sphere.draw();
}

// Draws a cylinder along z of height 1 centered at the origin
// and radius 0.5.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCylinder() {
    setMV();
    Cylinder.draw();
}

// Draws a cone along z of height 1 centered at the origin
// and base radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCone() {
    setMV();
    Cone.draw();
}

// Post multiples the modelview matrix with a translation matrix
// and replaces the modeling matrix with the result, x, y, and z are the translation amounts for each axis
function gTranslate(x,y,z) {
    modelMatrix = mult(modelMatrix,translate([x,y,z]));
}

// Post multiples the modelview matrix with a rotation matrix
// and replaces the modeling matrix with the result, theta is the rotation amount, x, y, z are the components of an axis vector (angle, axis rotations!)
function gRotate(theta,x,y,z) {
    modelMatrix = mult(modelMatrix,rotate(theta,[x,y,z]));
}

// Post multiples the modelview matrix with a scaling matrix
// and replaces the modeling matrix with the result, x, y, and z are the scale amounts for each axis
function gScale(sx,sy,sz) {
    modelMatrix = mult(modelMatrix,scale(sx,sy,sz));
}

// Pops MS and stores the result as the current modelMatrix
function gPop() {
    modelMatrix = MS.pop();
}

// pushes the current modelViewMatrix in the stack MS
function gPush() {
    MS.push(modelMatrix);
}

function initStars() {
    for (let i = 0; i < NUM_STARS; i++) {
        stars.push({
            x: randomRange(minX, maxX),  // Anywhere horizontally in view
            y: randomRange(minY, maxY),  // Anywhere vertically in view
            baseScale: 0.02 + Math.random() * 0.03,  // Smaller stars
            speedX: randomRange(1.0, 1.0),
            speedY: randomRange(1.0, 1.0)
        });
    }
}

function spawnStar() {
    // Decide randomly if the star spawns on the left edge or bottom edge
    // 0 => left edge, 1 => bottom edge
    let spawnEdge = Math.random() < 0.5 ? 0 : 1;
    
    let x, y;
    if (spawnEdge === 0) {
        // Left edge
        x = randomRange(minX - 1, minX);
        // random y in the full vertical range
        y = randomRange(minY, maxY);
    } else {
        // Bottom edge
        y = randomRange(minY - 1, minY);
        // random x in the full horizontal range
        x = randomRange(minX, maxX);
    }
    
    // Smaller base scale: e.g. [0.02..0.05]
    let baseScale = 0.02 + Math.random() * 0.03;
    
    // We want the star to move diagonally up-right:
    // Speed in X and Y are both positive.
    // Let's randomize them so some are faster, some slower.
    let speedX = randomRange(1.0, 1.0);
    let speedY = randomRange(1.0, 1.0);
    
    return {
        x: x,
        y: y,
        baseScale: baseScale,
        speedX: speedX,
        speedY: speedY
    };
}

// Helper for random range
function randomRange(minVal, maxVal) {
    return minVal + Math.random() * (maxVal - minVal);
}



function updateStars(dt) {
    for (let i = 0; i < NUM_STARS; i++) {
        let s = stars[i];
        
        // Move diagonally up-right
        s.x += s.speedX * dt;
        s.y += s.speedY * dt;
        
        // If off the top or right edges, respawn
        if (s.x > maxX || s.y > maxY) {
            stars[i] = spawnStar();
        }
    }
}



function drawStars() {
    for (let i = 0; i < NUM_STARS; i++) {
        let s = stars[i];
        
        // Distance from center
        let dist = Math.sqrt(s.x*s.x + s.y*s.y);
        
        // Optionally enlarge as they approach center
        let starScale = s.baseScale + 0.01 * (6.0 - dist);
        if (starScale < s.baseScale) starScale = s.baseScale;
        if (starScale > 0.15) starScale = 0.15; // cap it
        
        gPush();
          gTranslate(s.x, s.y, -3.0); // behind the main scene
          gScale(starScale, starScale, starScale);
          // A “white” star (could add slight color variation)
          setColor(vec4(1.0, 1.0, 1.0, 1.0));
          drawSphere();
        gPop();
    }
}

function drawSpaceJellyBody() {
    gPush();
      setColor(vec4(1.0, 0.2, 0.6, 1.0));
      gScale(0.4, 0.4, 0.4);
      drawSphere();
    gPop();

    gPush();
      setColor(vec4(1.0, 0.2, 0.6, 1.0));
      gTranslate(0.0, -0.6, 0.0);
      gScale(0.3, 0.3, 0.3);
      drawSphere();
    gPop();
}

function drawTentacle() {
    for (let i = 0; i < 5; i++) {
        gPush();
          const waveAngle = tentacleWaveAmp * Math.sin(tentacleWaveFreq * TIME + i * 0.5);
          gRotate(waveAngle, 1, 0, 0);
          gTranslate(0.0, -0.2 * i, 0.0);
          gScale(0.08, 0.15, 0.08);
          setColor(vec4(1.0, 0.6, 1.0, 1.0));
          drawSphere();
        gPop();
    }
}

function drawSpaceJelly() {
    // Move the jelly up/down along the vertical (Y) axis
    // using jellyOrbitAngle to oscillate or revolve
    const x = jellyOrbitRadius * Math.cos(jellyOrbitAngle);
    const z = jellyOrbitRadius * Math.sin(jellyOrbitAngle);
    gTranslate(x, 0.0, z);
    gRotate((jellyOrbitAngle * 180 / Math.PI) + 90, 0, 1, 0);
    drawSpaceJellyBody();
    for (let t = 0; t < 3; t++) {
        gPush();
            gRotate(120 * t, 0, 1, 0);
            gTranslate(0.4, -0.3, 0.0);
            drawTentacle();
        gPop();
    }
}


function drawAstronaut() {
    // Overall astronaut transformation (includes body oscillation, updated elsewhere)
    gPush();
    gTranslate(astronautPosX, astronautPosY, 0);
    gScale(0.75, 0.75, 0.75);

      // ------------------ TORSO ------------------

      // ------------------ HELMET (Head) ------------------
    gPush();
    gScale(0.9, 0.9, 0.9);
    gTranslate(0, 3.85, 0); // Position head above body
    setColor(vec4(1.0, 1.0, 1.0, 1.0)); // White for helmet
    drawSphere();
    gPop();

    gPush();
        gTranslate(-0.15, 3.5, 1.0); // Position slightly forward
        gScale(0.9, 0.6, 0.4); // Oval shape for face shield
        setColor(vec4(1.0, 0.6, 0.0, 1.0)); // Orange color
        drawSphere();
    gPop();

    gPush();
        gRotate(-30, 0, 9, 0.3);
        gTranslate(0.2, 1.05, 0.5);
        gScale(1.1, 1.6, 0.5);
        setColor(vec4(1.0, 1.0, 1.0, 1.0));
        drawCube(); // Main body cube
    gPop();


    // ------------------ LEFT ARM ------------------
    gPush();
        // Position pivot at left shoulder
        gTranslate(-2.0, 2.10, 1);
        // Apply animated rotation (update leftArmAngle elsewhere)
        gRotate(leftArmAngle, 70, -30, -40);
        gScale(1.0, 0.3, 0.3);
        setColor(vec4(1.0, 1.0, 1.0, 1.0));
        // Increase arm size for a more 3D look
        drawCube();
    gPop();

      // ------------------ RIGHT ARM ------------------
    gPush();
        gTranslate(2.0, 2.10, 1);
        // Apply animated rotation (update leftArmAngle elsewhere)
        gRotate(rightArmAngle, 70, -30, -40);
        gScale(1.0, 0.3, 0.3);
        setColor(vec4(1.0, 1.0, 1.0, 1.0));
        // Increase arm size for a more 3D look
        drawCube();
    gPop();

    // ------------------ LEFT LEG (Spaced Out at Joints) ------------------
    gPush();
        // Move the left leg outward in X
        gTranslate(-0.4, -0.5, 0.0);

        // Small rotation factor for minimal displacement
        gRotate(leftHipAngle * 0.2, 0, 0, 1);

        // Upper leg (larger scale)
        gPush();
            // Thicker and taller
            gScale(0.35, 1.2, 0.35);
            drawCube();
        gPop();

        // Move down to knee, giving more space for the joint
        gTranslate(0.0, -1.3, 0.0); 
        gRotate(leftKneeAngle * 0.2, 0, 0, 1);

        // Lower leg (same thickness, slightly shorter)
        gPush();
            gScale(0.35, 1.0, 0.35);
            drawCube();
        gPop();

        // Foot: move further down and forward to avoid collision
        gPush();
            gTranslate(0.0, -0.6, 0.5);
            gScale(0.35, 0.1, 0.5);
            drawCube();
        gPop();

    gPop();


    // ------------------ RIGHT LEG (Spaced Out at Joints) ------------------
    gPush();
        // Move the right leg outward in X
        gTranslate(0.4, -0.5, 0.0);

        // Small rotation factor for minimal displacement
        gRotate(rightHipAngle * 0.2, 0, 0, 1);

        // Upper leg
        gPush();
            gScale(0.35, 1.2, 0.35);
            drawCube();
        gPop();

        // Move down to knee
        gTranslate(0.0, -1.3, 0.0);
        gRotate(rightKneeAngle * 0.2, 0, 0, 1);

        // Lower leg
        gPush();
            gScale(0.35, 1.0, 0.35);
            drawCube();
        gPop();

        // Foot: moved further down/forward
        gPush();
            gTranslate(0.0, -0.6, 0.5);
            gScale(0.35, 0.1, 0.5);
            drawCube();
        gPop();

    gPop();

    gPush();
        gTranslate(-0.75, 1.9, 1.0); // Position slightly forward
        gScale(0.2, 0.2, 0.2); // Oval shape for face shield
        setColor(vec4(0.0, 0.0, 1.0, 1.0)); // Orange color
        drawSphere();
    gPop();
}

function render(timestamp) {
    
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    eye = vec3(0,0,10);
    MS = []; // Initialize modeling matrix stack
	
	// initialize the modeling matrix to identity
    modelMatrix = mat4();
    
    // set the camera matrix
    viewMatrix = lookAt(eye, at , up);
   
    // set the projection matrix
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);
    
    
    // set all the matrices
    setAllMatrices();
    
    if (animFlag) {
        dt = (timestamp - prevTime) / 1000.0;
        prevTime = timestamp;
        updateStars(dt);

        TIME += dt;

        var diagAmplitude = 0.3;
        astronautPosX = diagAmplitude * Math.cos(TIME);
        astronautPosY = diagAmplitude * Math.cos(TIME);

        // 2) Animate arms (e.g., wave them +/- 20 degrees)
        leftArmAngle  =  20 * Math.sin(2.0 * TIME);
        rightArmAngle = -20 * Math.sin(2.0 * TIME);

        // 3) Animate legs
        // Hips: rotate ±15 degrees out of phase
        leftHipAngle  =  15 * Math.sin(1.5 * TIME);
        rightHipAngle = -15 * Math.sin(1.5 * TIME);

        // Knees: small bend ±10 degrees
        leftKneeAngle  = 10 * Math.sin(1.5 * TIME + 1.0);
        rightKneeAngle = 10 * Math.sin(1.5 * TIME + 2.0);
    }

    // Draw the stars first
    gPush();
      drawStars();
    gPop();

    //Draw astronaut
    gPush();
        drawAstronaut();
    gPop();

    gPush();
        drawSpaceJelly();
    gPop();

    if (animFlag) {
        window.requestAnimFrame(render);
    }
	
}