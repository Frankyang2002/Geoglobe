import * as THREE from 'three';
import Globe from 'three-globe';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import mapTexture from '../public/assets/HDmap.jpg'; 
import countryDatabase from '../public/assets/countries.geo.json';

const globeRadius = 100;
const borderWidth = 0.75; // Adjust this value for thicker/thinner borders

function createLineFromCoordinates(coordinates, radius) {
    const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: borderWidth
    });

    const points = coordinates.map(coord => {
        const [lon, lat] = coord;
        return latLonToVector3(lat, lon, radius);
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.Line(geometry, material);
}

function convertGeoJSONToLines(feature) {
    const lines = [];

    if (feature.geometry.type === 'Polygon') {
        const line = createLineFromCoordinates(feature.geometry.coordinates[0], globeRadius);
        lines.push(line);
    } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach(polygon => {
            const line = createLineFromCoordinates(polygon[0], globeRadius);
            lines.push(line);
        });
    }

    return lines;
}

function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 90) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
}

export function initGlobe() {
    const container = document.getElementById('globe-container');
    const width = window.innerWidth;
    const height = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 300;

    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 1000);
    pointLight.position.set(50, 50, 50);
    scene.add(pointLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.minDistance = 150;
    controls.maxDistance = 600;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 1.0;
    controls.enableDamping = true;
    controls.dampingFactor = 1.0;

    const globe = new Globe()
        .globeImageUrl(mapTexture)
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png');
    globe.scale.set(globeRadius / 100, globeRadius / 100, globeRadius / 100);

    const globeMaterial = globe.material;
    console.log(globe)
    globe.rotation.y = Math.PI * 2; // Rotate globe for alignment

    scene.add(globe);

    let countryLines = [];
    const countryMeshes = createCountryMeshes(countryDatabase);

    function createCountryMeshes(geoJsonData) {
        let lines = [];

        geoJsonData.features.forEach((feature) => {
            const lineGeometries = convertGeoJSONToLines(feature);
            lineGeometries.forEach(line => {
                scene.add(line);
                lines.push(line);
            });
        });
        return lines;
    }

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    animate();
}