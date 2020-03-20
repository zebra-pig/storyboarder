import { connect } from 'react-redux'
import ModelObject from '../shot-generator/components/Three/ModelObject'
import Environment from '../shot-generator/components/Three/Environment'
import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import Ground from '../shot-generator/components/Three/Ground'
import useTextureLoader from '../shot-generator/hooks/use-texture-loader'
import { 
    getSceneObjects,
    getWorld,
    getSelectedBone,
    updateCharacterSkeleton,
    updateCharacterIkSkeleton,
    updateObject,
    updateObjects,
    deleteObjects,

 } from '../shared/reducers/shot-generator'
import { useThree } from 'react-three-fiber'
import ModelLoader from '../services/model-loader'
import Character from './Character'
import Attachable from './Attachable'
import Light from '../shot-generator/components/Three/Light'
import Volume from '../shot-generator/components/Three/Volume'
import Image from '../shot-generator/components/Three/Image'
import SimpleErrorBoundary from '../shot-generator/components/SimpleErrorBoundary'
import { getFilePathForImages } from '../shot-generator/helpers/get-filepath-for-images'
import { SHOT_LAYERS } from '../shot-generator/utils/ShotLayers'
import Room from '../shot-generator/components/Three/Room'
import Group from '../shot-generator/components/Three/Group'
import CameraUpdate from '../shot-generator/CameraUpdate'
import deepEqualSelector from '../utils/deepEqualSelector'


const sceneObjectSelector = (state) => {
  const sceneObjects = getSceneObjects(state)

  let newSceneObjects = {}
  let keys = Object.keys(sceneObjects)
  for(let i = 0; i < keys.length; i++) {
    let key = keys[i]
    if(sceneObjects[key].type !== "camera")
      newSceneObjects[key] = sceneObjects[key]
  }
  return newSceneObjects
}

const getSceneObjectsM = deepEqualSelector([sceneObjectSelector], (sceneObjects) => sceneObjects)

const ShotExplorerSceneManager = connect(
    state => ({
        sceneObjects: getSceneObjectsM(state),
        world: getWorld(state),
        storyboarderFilePath: state.meta.storyboarderFilePath,
        models: state.models,
        selectedBone: getSelectedBone(state),
    }),
    {
        updateCharacterSkeleton,
        updateCharacterIkSkeleton,
        updateObject,
        updateObjects,
        deleteObjects,
        withState: (fn) => (dispatch, getState) => fn(dispatch, getState())
    }
)( React.memo(({ 
    sceneObjects,

    world,
    storyboarderFilePath,
    updateCharacterSkeleton,
    updateCharacterIkSkeleton,
    updateObject,
    models,
    selectedBone,

    setLargeCanvasData,
    renderData,
    deleteObjects,
    withState,
    isPreview
}) => {
    const { scene, camera, gl } = useThree()
    const rootRef = useRef()
    const groundRef = useRef()
    const ambientLightRef = useRef()
    const directionalLightRef = useRef()

    const sceneObjectLength = Object.values(sceneObjects).length

    const modelObjectIds = useMemo(() => {
      return Object.values(sceneObjects).filter(o => o.type === 'object').map(o => o.id)
    }, [sceneObjectLength])

    const characterIds = useMemo(() => {
      return Object.values(sceneObjects).filter(o => o.type === 'character').map(o => o.id)
    }, [sceneObjectLength]) 

    const lightIds = useMemo(() => {
      return Object.values(sceneObjects).filter(o => o.type === 'light').map(o => o.id)
    }, [sceneObjectLength])

    const attachableIds = useMemo(() => {
      return Object.values(sceneObjects).filter(o => o.type === 'attachable').map(o => o.id)
    }, [sceneObjectLength])

    const volumeIds = useMemo(() => {
      return Object.values(sceneObjects).filter(o => o.type === 'volume').map(o => o.id)
    }, [sceneObjectLength]) 

    const imageIds = useMemo(() => {
      return Object.values(sceneObjects).filter(o => o.type === 'image').map(o => o.id)
    }, [sceneObjectLength])

    const groupIds = useMemo(() => {
      return Object.values(sceneObjects).filter(o => o.type === 'group').map(o => o.id)
    }, [sceneObjectLength]) 

    useEffect(() => { 
      setLargeCanvasData(camera, scene, gl)
    }, [scene, camera, gl, renderData])

    const groundTexture = useTextureLoader(window.__dirname + '/data/shot-generator/grid_floor_1.png')
    const roomTexture = useTextureLoader(window.__dirname + '/data/shot-generator/grid_wall2.png')
    useEffect(() => { 
        directionalLightRef.current.intensity = world.directional.intensity
        directionalLightRef.current.rotation.x = 0
        directionalLightRef.current.rotation.z = 0
        directionalLightRef.current.rotation.y = world.directional.rotation
        directionalLightRef.current.rotateX(world.directional.tilt+Math.PI/2)
    }, [world])

    useEffect(() => {
      scene.background = new THREE.Color(world.backgroundColor)
    }, [world.backgroundColor])

    useEffect(() => {
      if(!directionalLightRef.current) return
      directionalLightRef.current.rotation.x = 0
      directionalLightRef.current.rotation.z = 0
      directionalLightRef.current.rotation.y = world.directional.rotation
      directionalLightRef.current.rotateX(world.directional.tilt+Math.PI/2)
    }, [world.directional.rotation, world.directional.tilt])

    return <group ref={ rootRef }> 
    <CameraUpdate/>
    <ambientLight
        ref={ ambientLightRef }
        color={ 0xffffff }
        intensity={ world.ambient.intensity } 
        onUpdate={ self => (self.layers.enable(SHOT_LAYERS)) }/>

    <directionalLight
        ref={ directionalLightRef }
        color={ 0xffffff }
        intensity={ world.directional.intensity }
        position={ [0, 1.5, 0] }
        target-position={ [0, 0, 0.4] }
        onUpdate={ self => (self.layers.enable(SHOT_LAYERS)) }
    > 
      <primitive object={directionalLightRef.current ? directionalLightRef.current.target : new THREE.Object3D()}/>
    </directionalLight>
    {
        modelObjectIds.map(id => {
            let sceneObject = sceneObjects[id]
            return <SimpleErrorBoundary  key={ id }>
              <ModelObject
                path={ModelLoader.getFilepathForModel(sceneObject, {storyboarderFilePath}) }
                sceneObject={ sceneObject }
                updateObject={ updateObject }
                />
            </SimpleErrorBoundary>
        })
    }
    {    
        characterIds.map(id => {
            let sceneObject = sceneObjects[id]
            return <SimpleErrorBoundary  key={ id }>
              <Character
                path={ModelLoader.getFilepathForModel(sceneObject, {storyboarderFilePath}) }
                sceneObject={ sceneObject }
                modelSettings={ models[sceneObject.model] }
                selectedBone={ selectedBone }
                updateCharacterSkeleton={ () => {} }
               // updateCharacterIkSkeleton={ updateCharacterIkSkeleton }
                renderData={renderData}
                withState={ withState }
                isPreview={ isPreview }
                />
              </SimpleErrorBoundary>
        })
    }
    {
        lightIds.map(id => {
            let sceneObject = sceneObjects[id]
            return <SimpleErrorBoundary  key={ id }>
              <Light
                sceneObject={ sceneObject } />
              </SimpleErrorBoundary>
        })
    }
    {
        attachableIds.map(id => {
            let sceneObject = sceneObjects[id]
            return <SimpleErrorBoundary  key={ id }>
              <Attachable
                path={ModelLoader.getFilepathForModel(sceneObject, {storyboarderFilePath}) }
                sceneObject={ sceneObject }
                updateObject={ () => {}  }
                сharacterModelPath={ ModelLoader.getFilepathForModel(sceneObjects[sceneObject.attachToId], {storyboarderFilePath}) }
                deleteObjects={ deleteObjects }
                character={ sceneObjects[sceneObject.attachToId] }
                withState={ withState }
              />
              </SimpleErrorBoundary>
        })
    }
    {
        volumeIds.map(id => {
            let sceneObject = sceneObjects[id]
            return <SimpleErrorBoundary  key={ id }>
              <Volume
                imagesPaths={ getFilePathForImages(sceneObject, storyboarderFilePath) }
                sceneObject={ sceneObject }
                numberOfLayers= { sceneObject.numberOfLayers }/>
              </SimpleErrorBoundary>
        })
    }
    {
        imageIds.map(id => {
            let sceneObject = sceneObjects[id]
            return <SimpleErrorBoundary key={ id }>
              <Image
                imagesPaths={getFilePathForImages(sceneObject, storyboarderFilePath)}
                sceneObject={ sceneObject }/>
              </SimpleErrorBoundary>
        })
    }
    {
       groupIds.map(id => {
          let sceneObject = sceneObjects[id]
          return <Group
            key={ sceneObject.id }
            scene={ scene }
            updateObject={ updateObject }
            { ...sceneObject }
          />
       })
        
    }
    { 
        groundTexture && <Ground
            objRef={ groundRef }
            texture={ groundTexture }
            visible={ !world.room.visible && world.ground } />
    }   
    {
        world.environment.file &&  <Environment
              path={ModelLoader.getFilepathForModel({
                type: "environment",
                model: world.environment.file
              }, { storyboarderFilePath } )}
              environment={world.environment}
              visible={world.environment.visible} />
    }
    {
        roomTexture && <Room
              texture={ roomTexture }
              width={world.room.width}
              length={world.room.length}
              height={world.room.height}
              visible={world.room.visible} />
    }
    </group>
    })
)
export default ShotExplorerSceneManager
