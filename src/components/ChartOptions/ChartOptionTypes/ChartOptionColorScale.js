import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import InilineColorPicker from '../../InlineColorPicker'
import ColorSchemesDropDown from './ColorSchemesDropDown'
import { Row, Col } from 'react-bootstrap'
import get from 'lodash/get'
import {
  getInitialScaleValues,
  getColorScale,
  getDefaultColorScale,
  getColorDomain,
  colorPresets,
  getAvailableScaleTypes,
  getValueType,
} from '@raw-temp/rawgraphs-core'
import styles from '../ChartOptions.module.scss'
import usePrevious from '../../../hooks/usePrevious'
import { initial, isEqual } from 'lodash'


function getDatePickerValue(userValue) {
  if (userValue.userDomain === 0) {
    return 0
  }
  if (!userValue.userDomain) {
    return ''
  }

  if (getValueType(userValue.userDomain) === 'date') {
    return userValue.userDomain.toISOString().substring(0, 10)
  }

  return userValue.userDomain
}

const ChartOptionColorScale = ({
  value,
  error,
  onChange,
  defaultValue,
  label,
  dimension,
  dataset,
  mapping,
  dataTypes,
  chart,
  mappedData,
  mappingValue,
  colorDataset,
  colorDataType,
  hasAnyMapping,
  ...props
}) => {


  const [scaleType, setScaleType] = useState(get(value, 'scaleType'))

  
  const defaultColor = useMemo(() => {
    const colorFromDefault = get(defaultValue, 'defaultColor', '#cccccc')
    return get(value, 'defaultColor', colorFromDefault)
  }, [defaultValue, value])

  
  const availableScaleTypes = useMemo(() => {
    const nextTypes = getAvailableScaleTypes(colorDataType, colorDataset)
    return nextTypes
  }, [colorDataType, colorDataset])

  const [interpolators, setInterpolators] = useState(
    get(value, 'scaleType')
      ? Object.keys(colorPresets[get(value, 'scaleType')])
      : []
  )

  const [interpolator, setInterpolator] = useState(get(value, 'interpolator'))
  const [userValues, setUserValues] = useState(
    get(value, 'userScaleValues', []).map((userValue) => ({
      ...userValue,
      userDomain: userValue.domain,
      userRange: userValue.range,
    }))
  )

  const getCurrentFinalScale = useCallback(
    (interpolator, scaleType, userValuesForFinalScale, defaultColor) => {
      if (
        !scaleType ||
        !interpolator ||
        !colorPresets[scaleType][interpolator] ||
        !userValuesForFinalScale ||
        !userValuesForFinalScale.length
      ) {
        return
      }

      const domains = userValuesForFinalScale
        .map((x) => x.domain)
        .filter((x) => x !== undefined)
      if (!domains.length) {
        return
      }

      const previewScale = getColorScale(
        colorDataset, //the array of values of the dataset mapped on the color dimension
        colorDataType,
        scaleType, //
        interpolator,
        userValuesForFinalScale,
      )

      return previewScale
    },
    [colorDataType, colorDataset]
  )

  const getDefaultUserValues = useCallback(
    (interpolator, scaleType) => {
      if (!colorDataset.length || !colorDataType || !scaleType) {
        return []
      }
      if (!colorPresets[scaleType][interpolator]) {
        return []
      }

      const domain = getColorDomain(colorDataset, colorDataType, scaleType)

      return getInitialScaleValues(domain, scaleType, interpolator).map(
        (userValue) => ({
          ...userValue,
          userRange: userValue.range,
          userDomain: userValue.domain,
        })
      )
    },
    [colorDataType, colorDataset]
  )

  const getUserValuesForFinalScale = useCallback(
    (values) => {
      return values.map((value) => ({
        range: value.userRange,
        domain:
          colorDataType === 'date'
            ? value.userDomain?.toString()
            : value.userDomain,
        // domain: value.userDomain,
      }))
    },
    [colorDataType]
  )

  const currentFinalScale = useMemo(() => {

    if (scaleType && interpolator) {
      const currentUserValues =
        userValues && userValues.length
          ? userValues
          : getDefaultUserValues(interpolator, scaleType)
      const valuesForFinalScale = getUserValuesForFinalScale(currentUserValues)
      return getCurrentFinalScale(interpolator, scaleType, valuesForFinalScale)
    }
    return getDefaultColorScale()
  }, [
    getCurrentFinalScale,
    getDefaultUserValues,
    getUserValuesForFinalScale,
    interpolator,
    scaleType,
    userValues,
  ])

  const handleChangeValues = useCallback(
    (nextUserValues) => {
      let valuesForFinalScale = getUserValuesForFinalScale(nextUserValues)
      
      //notify ui
      const outScaleParams = {
        scaleType,
        interpolator: interpolator,
        userScaleValues: valuesForFinalScale,
        defaultColor,
      }
      onChange(outScaleParams)
    },
    [getUserValuesForFinalScale, interpolator, onChange, scaleType, defaultColor]
  )

  const setUserValueRange = useCallback(
    (index, value) => {
      const newUserValues = [...userValues]
      newUserValues[index].userRange = value
      setUserValues(newUserValues)
      handleChangeValues(newUserValues)
    },
    [handleChangeValues, userValues]
  )

  const setUserValueDomain = useCallback(
    (index, value) => {
      const newUserValues = [...userValues]
      newUserValues[index].userDomain = value
      setUserValues(newUserValues)
      handleChangeValues(newUserValues)
    },
    [handleChangeValues, userValues]
  )


  const handleChangeScaleType = useCallback(
    (nextScaleType) => {
      setScaleType(nextScaleType)

      //update interpolators
      const nextInterpolators = colorPresets[nextScaleType]
        ? Object.keys(colorPresets[nextScaleType])
        : []
      setInterpolators(nextInterpolators)

      //set first interpolator
      const nextInterpolator = nextInterpolators[0]
      setInterpolator(nextInterpolator)

      //user values
      const nextUserValues = getDefaultUserValues(
        nextInterpolator,
        nextScaleType,
      )
      setUserValues(nextUserValues)
      const valuesForFinalScale = getUserValuesForFinalScale(nextUserValues)

      //notify ui
      const outScaleParams = {
        scaleType: nextScaleType,
        interpolator: nextInterpolator,
        userScaleValues: valuesForFinalScale,
        defaultColor,
      }
      onChange(outScaleParams)
    },
    [getDefaultUserValues, getUserValuesForFinalScale, onChange, defaultColor]
  )

  const handleSetInterpolator = useCallback(
    (nextInterpolator) => {
      setInterpolator(nextInterpolator)

      //user values
      const nextUserValues = getDefaultUserValues(nextInterpolator, scaleType)
      setUserValues(nextUserValues)
      const valuesForFinalScale = getUserValuesForFinalScale(nextUserValues)

      //notify ui
      const outScaleParams = {
        scaleType,
        interpolator: nextInterpolator,
        userScaleValues: valuesForFinalScale,
        defaultColor,
      }
      onChange(outScaleParams)
    },
    [getDefaultUserValues, getUserValuesForFinalScale, onChange, scaleType, defaultColor]
  )

  const resetScale = useCallback(() => {
    handleSetInterpolator(interpolator)
  }, [handleSetInterpolator, interpolator])

  const invertScale = useCallback(() => {
    
    
    let reversedValues = [...userValues]
    reversedValues.reverse()
    
    const invertedValues = userValues.map((v, i) => ({
      ...v,
      userRange: reversedValues[i].userRange, 
      range: reversedValues[i].range, 

    }))
    
    setUserValues(invertedValues)
    handleChangeValues(invertedValues)
  }, [handleChangeValues, userValues])

  
  const firstValueSet = useRef(scaleType === value.scaleType)
  const hadAnyMapping = usePrevious(hasAnyMapping)

  useEffect(() => {
    if(!firstValueSet.current){
      const nextScaleType = availableScaleTypes[0]
      handleChangeScaleType(nextScaleType)
    }
     
  }, [availableScaleTypes, handleChangeScaleType, scaleType])


  useEffect(() => {
    if(!hasAnyMapping && hadAnyMapping){
      firstValueSet.current = false
    }
  }, [mapping, hasAnyMapping, hadAnyMapping])


  return hasAnyMapping ? (
    <>
      <Row className={props.className}>
        <Col xs={6} className="d-flex align-items-center nowrap">
          {label}
        </Col>
        <Col xs={6}>
          <select
            disabled={!colorDataType}
            className="custom-select raw-select"
            value={scaleType}
            onChange={(e) => {
              handleChangeScaleType(e.target.value)
            }}
          >
            {availableScaleTypes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Col>
      </Row>

      {/* Color scheme */}
      <Row className={[props.className].join(' ')}>
        <Col xs={6} className="d-flex align-items-center nowrap">
          Color scheme
        </Col>
        <Col xs={6}>
          <ColorSchemesDropDown
            interpolators={interpolators}
            interpolator={interpolator}
            setInterpolator={handleSetInterpolator}
            // To display color-scale preview
            colorDataset={colorDataset}
            colorDataType={colorDataType}
            scaleType={scaleType}
            currentFinalScale={currentFinalScale}
          />
        </Col>
      </Row>

      {/* Scale color swatches */}
      {colorDataType && userValues && (
        <div className={styles['color-swatches-list']}>
          {userValues.map((userValue, i) => (
            <Row
              key={i}
              className={[
                styles['chart-option'],
                styles['color-swatch'],
                scaleType !== 'ordinal'
                  ? styles['not-ordinal']
                  : styles['ordinal'],
              ].join(' ')}
            >
              <Col xs={12}>
                <div className={styles['color-scale-item']}>
                  {scaleType === 'ordinal' &&
                    get(userValue, 'domain') !== undefined && (
                      <span
                        className="nowrap text-truncate pr-2"
                        title={userValue.domain && userValue.domain.toString()}
                      >
                        {userValue.domain === ''
                          ? '[empty string]'
                          : userValue.domain.toString()}
                      </span>
                    )}
                  {scaleType !== 'ordinal' && (
                    <>
                      <span className="nowrap">
                        {i === 0
                          ? 'Start'
                          : i === userValues.length - 1
                            ? 'End'
                            : 'Middle'}
                      </span>
                      <input
                        type={getValueType(userValue.userDomain)}
                        className="form-control text-field"
                        value={getDatePickerValue(userValue)}
                        onChange={(e) => {
                          if (colorDataType === 'date') {
                            setUserValueDomain(i, new Date(e.target.value))
                          } else {
                            setUserValueDomain(i, e.target.value)
                          }
                        }}
                      ></input>
                    </>
                  )}
                  <InilineColorPicker
                    color={userValue.userRange}
                    onChange={(color) => {
                      setUserValueRange(i, color)
                    }}
                  />
                </div>
              </Col>
            </Row>
          ))}
          <Row>
            <Col>
            <button type="button" onClick={resetScale}>RESET</button>
            <button type="button" onClick={invertScale}>INVERT</button>
            </Col>
          </Row>

        </div>
      )}

    </>
  ) : null
}

export default ChartOptionColorScale
