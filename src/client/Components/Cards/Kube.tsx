import React, { useEffect, useState } from 'react';
import { ClusterTypes } from '../../Interfaces/ICluster';
import { Put } from '../../Services';
import { apiRoute } from '../../utils';
import Module from './Module';
import ClusterSettings from '../Modules/ClusterSettings';
import { useAppDispatch, useAppSelector } from '../../Store/hooks';
import { setFavRender, setUI } from '../../Store/actions';
import { IReducers } from '../../Interfaces/IReducers';
import Container from '@mui/system/Container';
import Button from '@mui/material/Button';
import SettingsIcon from '@mui/icons-material/Settings';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import GaugeChart from 'react-gauge-chart';
import './styles.css';

const Kube = (props: ClusterTypes) => {
  const dispatch = useAppDispatch();
  const clusterReducer = useAppSelector(
    (state: IReducers) => state.clusterReducer
  );
  const apiReducer = useAppSelector((state: IReducers) => state.apiReducer);
  const uiReducer = useAppSelector((state: IReducers) => state.uiReducer);
  // need to convert below to redux?
  const [module, setModule] = useState(true);
  const [settings, setSettings] = useState(false);

  // accessing state to find data of the specfic cluster
  const [dbData] = useState(
    apiReducer.clusterDbData.find((element) => element._id === props._id)
  );

  useEffect(() => {
    dispatch(
      setUI(props._id, {
        currentModule: 'OpenFaaS',
        fullscreen: false,
        modules: {
          OpenFaaS: {
            deployDropdown: '',
            invokeDropdown: '',
            requestBody: '',
            responseBody: '',
          },
          query: {
            inputField: '',
            responseObject: '',
          },
        },
      })
    );
  }, []);

  const handleFavorite = async () => {
    try {
      const body = {
        clusterId: props._id,
        favorite: !props.favoriteStatus,
      };
      await Put(apiRoute.getRoute('cluster'), body, {
        authorization: localStorage.getItem('token'),
      });
      dispatch(setFavRender(!clusterReducer.favRender));
    } catch (err) {
      console.log(err);
    }
  };

  const handleSettings = async () => {
    try {
      console.log(uiReducer);
      setModule(!module);
      setSettings(!settings);
    } catch (err) {
      console.log(err);
    }
  };
  // props._id
  // console.log('This is props._id', props._id);
  // console.log(
  //   'This is apiReducer.clusterQueryData',
  //   apiReducer.clusterQueryData
  // );
  return (
    <Container
      sx={
        props.isDark
          ? {
              minWidth: '100%',
              justifyContent: 'left',
              display: 'flex',
              direction: 'column',
              textAlign: 'left',
              backgroundSize: 'contain',
              backgroundColor: '#181A1D',
            }
          : {
              minWidth: '100%',
              justifyContent: 'left',
              display: 'flex',
              direction: 'column',
              textAlign: 'left',
              backgroundSize: 'contain',
              backgroundColor: '#fafafa',
            }
      }
      id="Kube"
    >
      <div
        className="Kube-top-row"
        style={props.isDark ? { color: '#c0c0c0' } : { color: 'black' }}
      >
        <div className="cluster-title">
          {props.favoriteStatus && (
            <span className="set-favorite noselect" onClick={handleFavorite}>
              ❤️
            </span>
          )}
          {!props.favoriteStatus && (
            <span className="set-favorite noselect" onClick={handleFavorite}>
              🤍
            </span>
          )}
          <span className="set-favorite noselect">&nbsp;</span>
          <b>{'' + dbData?.name}:&nbsp;</b>
          {'' + dbData?.description}
        </div>
        <Button
          sx={props.isDark ? { color: '#c0c0c0' } : { color: '#3a4a5b' }}
          variant="text"
          id="basic-button"
          onClick={handleSettings}
        >
          {module && <SettingsIcon />}
          {settings && <AnalyticsIcon />}
        </Button>
      </div>
      <div id="overview">
        <div
          className="ov-box"
          style={
            props.isDark
              ? {
                  backgroundColor: '#34363b',
                  color: '#c0c0c0',
                }
              : {
                  backgroundColor: '#fafafa',
                }
          }
        >
          <div className="ov-title noselect">
            <h3>Nodes</h3>
          </div>
          <div className="ov-nodes">
            <div>
              Count:{' '}
              <b>
                {apiReducer.clusterQueryData[props._id]?.allNodes.length || 0}
              </b>
            </div>
            <div>
              <b>
                {apiReducer.clusterQueryData[props._id]?.allNodes[0] || '🔴'}
              </b>
            </div>
          </div>
        </div>
        <div
          className="ov-box"
          style={
            props.isDark
              ? {
                  backgroundColor: '#34363b',
                  color: '#c0c0c0',
                }
              : {
                  backgroundColor: '#fafafa',
                }
          }
        >
          <div className="ov-title noselect">
            <h3>Deployments</h3>
          </div>
          <div className="ov-content">
            <div>
              {apiReducer.clusterQueryData[props._id]?.totalDeployments
                .length || 0}
            </div>
          </div>
        </div>
        <div
          className="ov-box"
          style={
            props.isDark
              ? {
                  backgroundColor: '#34363b',
                  color: '#c0c0c0',
                }
              : {
                  backgroundColor: '#fafafa',
                }
          }
        >
          <div className="ov-title noselect">
            <h3>Pods</h3>
          </div>
          <div className="ov-content">
            <div>{apiReducer.clusterQueryData[props._id]?.totalPods || 0}</div>
          </div>
        </div>
        <div
          className="ov-box"
          style={
            props.isDark
              ? {
                  backgroundColor: '#34363b',
                  color: '#c0c0c0',
                }
              : {
                  backgroundColor: '#fafafa',
                }
          }
        >
          <div className="ov-title noselect">
            <h3>CPU Usage</h3>
          </div>
          <div className="ov-content">
            <GaugeChart
              nrOfLevels={30}
              colors={['green', '#FF5F6D']}
              arcWidth={0.1}
              percent={
                (apiReducer.clusterQueryData[props._id]?.cpuLoad || 0) / 100
              }
              style={{
                width: '90px',
                height: '2px',
              }}
              needleColor={props.isDark ? '#c0c0c0' : '#464A4F'}
            />
          </div>
        </div>
        <div
          className="ov-box"
          style={
            props.isDark
              ? {
                  backgroundColor: '#34363b',
                  color: '#c0c0c0',
                }
              : {
                  backgroundColor: '#fafafa',
                }
          }
        >
          <div className="ov-title noselect">
            <h3>Memory Usage</h3>
          </div>
          <div className="ov-content">
            <GaugeChart
              nrOfLevels={30}
              colors={['green', '#FF5F6D']}
              arcWidth={0.1}
              percent={
                (apiReducer.clusterQueryData[props._id]?.memoryLoad || 0) / 2048
              }
              style={{
                width: '90px',
                height: '2px',
              }}
              needleColor={props.isDark ? '#c0c0c0' : '#464A4F'}
            />
          </div>
          <div className="ov-metric">
            <p>
              {(apiReducer.clusterQueryData[props._id]?.memoryLoad || 0) +
                ' /2048 MB'}
            </p>
          </div>
        </div>
      </div>
      <div id="module">
        {module && (
          <Module id={dbData?._id} nested={true} isDark={props.isDark} />
        )}
        {settings && <ClusterSettings id={dbData?._id} />}
      </div>
    </Container>
  );
};

export default Kube;
