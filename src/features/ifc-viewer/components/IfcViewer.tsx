import React, { useEffect, useRef } from 'react';
import { Box, Paper } from '@mui/material';
import * as OBC from '@thatopen/components';
import * as THREE from 'three';
import { ViewerToolbar } from './ViewerToolbar';
import { FragmentsGroup } from '@thatopen/fragments';

interface ViewerComponents {
  components: OBC.Components;
  scene: OBC.SimpleScene;
  camera: OBC.SimpleCamera;
  renderer: OBC.SimpleRenderer;
  fragments: OBC.FragmentsManager;
}

export const IfcViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ViewerComponents>();

  useEffect(() => {
    const cleanup = () => {
      const current = viewerRef.current;
      if (current?.components) {
        current.components.dispose?.();
        viewerRef.current = undefined;
      }
    };

    const initializeViewer = async () => {
      if (!containerRef.current || viewerRef.current) return;

      try {
        // Create components instance
        const components = new OBC.Components();

        // Get fragments manager
        const fragments = await components.get(OBC.FragmentsManager);
        
        // Get worlds manager and create world
        const worlds = components.get(OBC.Worlds);
        const world = worlds.create();

        // Create scene
        const scene = new OBC.SimpleScene(components);
        scene.setup({
          background: {
            r: 0x2a / 0xff,
            g: 0x2a / 0xff,
            b: 0x2a / 0xff
          }
        });
        world.scene = scene;

        // Create renderer
        const renderer = new OBC.SimpleRenderer(components, containerRef.current);
        world.renderer = renderer;

        // Create camera
        const camera = new OBC.SimpleCamera(components);
        world.camera = camera;

        camera.controls.setLookAt(10, 10, 10, 0, 0, 0);

        // Add grid helper
        const grid = new THREE.GridHelper(20, 20);
        scene.three.add(grid);

        // Initialize components
        await components.init();
        
        // Store references
        viewerRef.current = {
          components,
          scene,
          camera,
          renderer,
          fragments
        };

        // Subscribe to fragments loaded event
        fragments.onFragmentsLoaded.add((model: FragmentsGroup) => {
          try {
            console.log('Fragments loaded:', model);
            
            if (!model.parent) {
              scene.three.add(model);
            }

            model.visible = true;

            // Wait for geometry to be loaded
            setTimeout(() => {
              try {
                const meshes: THREE.Mesh[] = [];
                model.traverse((child: THREE.Object3D) => {
                  if (child instanceof THREE.Mesh) {
                    meshes.push(child);
                    console.log('Found mesh:', child);
                  }
                });

                if (meshes.length === 0) {
                  console.warn('No meshes found in model');
                  return;
                }

                const bbox = new THREE.Box3();
                meshes.forEach(mesh => {
                  mesh.geometry.computeBoundingBox();
                  bbox.expandByObject(mesh);
                });

                if (!bbox.isEmpty()) {
                  const center = new THREE.Vector3();
                  const size = new THREE.Vector3();
                  bbox.getCenter(center);
                  bbox.getSize(size);

                  const maxDim = Math.max(size.x, size.y, size.z);
                  const scale = 20 / maxDim;

                  model.scale.setScalar(scale);
                  model.position.copy(center).multiplyScalar(-scale);

                  camera.controls.setLookAt(20, 20, 20, 0, 0, 0);
                  
                  // Update the renderer
                  renderer.update();
                }
              } catch (error) {
                console.error('Error processing model:', error);
              }
            }, 1000); // Give it a second to load geometry

          } catch (error) {
            console.error('Error handling loaded fragments:', error);
          }
        });

        // Add resize handler
        const handleResize = () => {
          if (!containerRef.current || !viewerRef.current) return;
          
          const { renderer, camera } = viewerRef.current;
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          
          renderer.three.setSize(width, height);

          const perspCamera = camera.controls.camera;
          if (perspCamera instanceof THREE.PerspectiveCamera) {
            perspCamera.aspect = width / height;
            perspCamera.updateProjectionMatrix();
          }

          renderer.three.render(scene.three, camera.controls.camera);
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
          window.removeEventListener('resize', handleResize);
          cleanup();
        };

      } catch (error) {
        console.error('Error initializing viewer:', error);
        cleanup();
      }
    };

    initializeViewer();
    return cleanup;
  }, []);

  const handleFileSelect = async (file: File) => {
    if (!viewerRef.current) return;

    try {
      console.log('Loading IFC file:', file.name);
      
      const { fragments, scene, camera, renderer } = viewerRef.current;
      
      // Remove existing models (keep the grid)
      scene.three.children = scene.three.children.filter(child => 
        child instanceof THREE.GridHelper
      );

      // Convert file to array buffer
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      
      // Load model with FragmentsManager
      const model = await fragments.load(data);
      console.log('Model loaded:', model);

      // Add model to scene if not already added
      if (!model.parent) {
        scene.three.add(model);
      }

      // Make sure model is visible
      model.visible = true;

      // Force initial render
      renderer.three.render(scene.three, camera.controls.camera);

      // Wait for fragments to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to get meshes
      const meshes: THREE.Mesh[] = [];
      model.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          meshes.push(child);
          console.log('Found mesh:', child);
        }
      });

      if (meshes.length === 0) {
        console.warn('No meshes found in model - checking fragments');
        
        // Try to access fragments directly
        const fragmentKeys = Array.from(model.keyFragments.keys());
        console.log('Fragment keys:', fragmentKeys);
        
        for (const key of fragmentKeys) {
          const fragmentPath = model.keyFragments.get(key);
          console.log('Fragment path:', fragmentPath);
          
          if (fragmentPath) {
            try {
              // Try to traverse the fragment
              model.traverse((child: THREE.Object3D) => {
                if (child instanceof THREE.Mesh) {
                  meshes.push(child);
                  console.log('Found mesh in fragment:', child);
                }
              });
            } catch (error) {
              console.error('Error processing fragment:', error);
            }
          }
        }
      }

      if (meshes.length > 0) {
        // Calculate bounding box
        const bbox = new THREE.Box3();
        meshes.forEach(mesh => {
          mesh.geometry.computeBoundingBox();
          bbox.expandByObject(mesh);
        });

        if (!bbox.isEmpty()) {
          const center = new THREE.Vector3();
          const size = new THREE.Vector3();
          bbox.getCenter(center);
          bbox.getSize(size);

          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 20 / maxDim;

          model.scale.setScalar(scale);
          model.position.copy(center).multiplyScalar(-scale);

          // Update camera to view the model
          camera.controls.setLookAt(
            center.x + 20,
            center.y + 20,
            center.z + 20,
            center.x,
            center.y,
            center.z
          );

          // Update the scene
          scene.three.updateMatrixWorld();
          renderer.three.render(scene.three, camera.controls.camera);
        }
      } else {
        console.error('Still no meshes found after all attempts');
      }

    } catch (error) {
      console.error('Error in file processing:', error);
    }
  };  

  return (
    <Box sx={{ 
      padding: {
        xs: '8px',
        sm: '16px'
      },
      height: {
        xs: 'calc(100vh - 64px)',
        sm: 'calc(100vh - 64px)'
      },
      display: 'flex',
      flexDirection: 'column',
      gap: {
        xs: 0.75,
        sm: 1.25
      },
    }}>
      <Paper 
        elevation={3} 
        sx={{ 
          borderRadius: {
            xs: 0.75,
            sm: 1
          },
          backgroundColor: 'background.paper',
        }}
      >
        <ViewerToolbar onFileSelect={handleFileSelect} />
      </Paper>

      <Paper 
        elevation={3} 
        sx={{ 
          flexGrow: 1,
          position: 'relative',
          borderRadius: {
            xs: 0.75,
            sm: 1
          },
          overflow: 'hidden',
          backgroundColor: 'background.paper',
          '& > div': {
            borderRadius: 'inherit'
          }
        }}
      >
        <Box 
          ref={containerRef}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            touchAction: 'none'
          }}
        />
      </Paper>
    </Box>
  );
}; 