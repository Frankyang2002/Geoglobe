import * as THREE from 'three';
import Globe from 'three-globe';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import mapTexture from '../public/assets/HDmap.jpg'; 
import countryDatabase from '../public/assets/countries.geo.json'; 

function convertGeoJSONToGeometry(feature) {
    const coordinates = feature.geometry.coordinates;
    const shapes = [];
    if (feature.geometry.type === 'Polygon') {
        const shape = new THREE.Shape();
        coordinates[0].forEach((coord, index) => {
            if (index === 0) {
                shape.moveTo(coord[0], coord[1]);
            } else {
                shape.lineTo(coord[0], coord[1]);
            }
        });
        shape.closePath();
        shapes.push(shape);
    } else if (feature.geometry.type === 'MultiPolygon') {
        coordinates.forEach(polygon => {
            const shape = new THREE.Shape();
            polygon[0].forEach((coord, index) => {
                if (index === 0) {
                    shape.moveTo(coord[0], coord[1]);
                } else {
                    shape.lineTo(coord[0], coord[1]);
                }
            });
            shape.closePath();
            shapes.push(shape);
        });
    }
    return shapes.map(shape => new THREE.ShapeGeometry(shape));
}



function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
}

export function initGlobe() {

    //Container
    const container = document.getElementById('globe-container');
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Create scene
    const scene = new THREE.Scene();

    // Create camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 200;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 4.0); // Increase intensity
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 1000); // White light with intensity 1
    pointLight.position.set(50, 50, 50); // Adjust position as needed
    scene.add(pointLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;      // Enable zooming
    controls.enablePan = false;      // Disable panning (optional)
    controls.minDistance = 150;      // Set the minimum zoom distance
    controls.maxDistance = 600;      // Set the maximum zoom distance
    controls.rotateSpeed = 0.5;      // Adjust rotation speed
    controls.zoomSpeed = 1.0;        // Adjust zoom speed
    controls.enableDamping = true;   // Smooth the interaction
    controls.dampingFactor = 1.0;    // Set damping factor for smoothness

    // Create globe
    const globe = new Globe()
        .globeImageUrl(mapTexture)
    scene.add(globe);

    let isDragging = false;
    let velocity = 0;

    let countryData = {};  
    let countryMeshes = createCountryMeshes(countryDatabase)
      

    function createCountryMeshes(geoJsonData) {
        let countryMeshes = []
        
        geoJsonData.features.forEach((feature) => {
            const geometries = convertGeoJSONToGeometry(feature);
            geometries.forEach(geometry => {
                const material = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.5,
                    side: THREE.DoubleSide
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.userData = { name: feature.properties.name };
                scene.add(mesh);
                countryMeshes.push(mesh);
                if (!countryData[feature.properties.name]) {
                    countryData[feature.properties.name] = [];
                }
                countryData[feature.properties.name].push(mesh);
            });

        });
        return countryMeshes
    }
    
    // Raycaster and mouse for interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Initialize country data
    let highlightedCountry = null;

    window.addEventListener('mousemove', onMouseMove);

    // Handle mouse move event
    function onMouseMove(event) {
        event.preventDefault();

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(countryMeshes);

        if (intersects.length > 0) {
            const intersectedMesh = intersects[0].object;
            const countryName = intersectedMesh.userData.name;
            highlightCountry(countryName);
            
            // Display country name (replace with your own method for showing text)
            
        } else {
            // If not hovering over any country, reset highlights
            if (highlightedCountry) {
                countryData[highlightedCountry].forEach((geometry) => {
                    geometry.material.color.set(0xffffff);
                });
                highlightedCountry = null;
                hideCountryName()
            }
        }
    }
    window.addEventListener('mousemove', onMouseMove, false);

    function highlightCountry(countryName) {
        // Remove previous highlight
        if (highlightedCountry) {
            console.log(highlightCountry)
            countryData[highlightedCountry].forEach((geometry) => {
                geometry.material.color.set(0xffffff);
            });
            
        }

        // Highlight the current country
        console.log(countryData) 
        countryData[countryName].forEach((geometry) => {
            geometry.material.color.set(0xffff00); // Highlight color
        });
        displayCountryName(countryName, event.clientX, event.clientY);

        highlightedCountry = countryName;
    }



    // Display country name
    function displayCountryName(name, x, y) {
        const label = document.getElementById('countryLabel');
        label.style.left = `${x + 10}px`;
        label.style.top = `${y + 10}px`;
        label.textContent = name;
        label.style.display = 'block';
    }

    // Hide country name
    function hideCountryName() {
        const label = document.getElementById('countryLabel');
        label.style.display = 'none';
    }


    // Capture the rotation speed
    container.addEventListener('mousedown', () => {
        isDragging = true;
        velocity = 0;  // Reset velocity when starting to drag
    });

    container.addEventListener('mouseup', () => {
        isDragging = false;
    });

    container.addEventListener('mousemove', (event) => {
        if (isDragging) {
            velocity = event.movementX * 0.005;  // Adjust this factor for sensitivity
        }
    });


    container.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false; // Stop dragging if mouse leaves the container, kinda like google earth
        }
    });


    // Update the globe's rotation based on velocity
    function spinGlobe() {
        if (!isDragging) {
            globe.rotation.y += velocity;
            velocity *= 0.9;  // Apply friction to gradually slow down the spin
        }
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        spinGlobe();  
        renderer.render(scene, camera);
    }

    animate();
}