import HorizontalOneThirdRule from "./HorizontalOneThirdRule"
import RollRule from "./RollRule"
import * as THREE from 'three'

const clamRotationTo = (rotation, clampDegree = 180) => {
    if(rotation === clampDegree || rotation === -clampDegree) return rotation
    let clampLimit = Math.max(-clampDegree, Math.min(clampDegree, rotation))
    let newRotation = rotation
    if(clampLimit !== rotation) {
        newRotation = (rotation - clampLimit) - clampLimit
    }
    return newRotation
}

const getRandomNumber = (maxLength) => {
    let number = Math.floor(Math.random() * (maxLength));
    return number;
}

const generateRule = (focusedCenter, character, shot, camera) => {
    let i = getRandomNumber(100);
    let results = [];

    if(i < 10) {
        results.push(new RollRule(focusedCenter, camera))
    }
    if(i < 70) {
        let characterRotation = character.rotation.y * THREE.Math.RAD2DEG
        let cameraRotation = shot.cameraRotation ? shot.cameraRotation * THREE.Math.RAD2DEG : 0
        let characterFacingRotation = cameraRotation - (characterRotation)
        characterFacingRotation = clamRotationTo(characterFacingRotation)
        results.push(new HorizontalOneThirdRule(focusedCenter, camera, characterFacingRotation < 0 ? "left" : "right"));
    }

    return results
    
}

export default generateRule