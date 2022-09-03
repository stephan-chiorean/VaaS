import React, { useState, useEffect, ChangeEvent } from 'react';
import { Modules } from '../../Interfaces/ICluster';
import { Get, Post } from '../../Services';
import { FunctionTypes } from '../../Interfaces/IFunction';
import './styles.css';
import { apiRoute } from '../../utils';
import { useLocation } from 'react-router-dom';

const OpenFaaS = (props: Modules) => {
  const { state }: any = useLocation();
  const [id] = useState(props.id || state[0]);
  const [deployedFunctions, setDeployedFunctions] = useState<FunctionTypes[]>([]);
  const [openFaaSFunctions, setOpenFaaSFunctions] = useState<FunctionTypes[]>([]);
  const [selectedOpenFaaSFunction, setSelectedOpenFaaSFunction] = useState('');
  const [selectedDeployedFunction, setSelectedDeployedFunction] = useState('');
  const [invokedOutput, setInvokedOutput] = useState('');
  const [renderFunctions, setRenderFunctions] = useState(false);

  useEffect(() => {
    const openFaaSFunctions = async () => {
      try {
        const funcs = await Get(apiRoute.getRoute('faas?OpenFaaSStore=true'), { authorization: localStorage.getItem('token') });
        setOpenFaaSFunctions(funcs.functions);
      } catch (error) {
        console.log('Error in fetching OpenFaaS Functions', error);
      }
    };
    const fetchFunctions = async () => {
      try {
        const funcs = await Get(
          apiRoute.getRoute(`faas`),
          { 
            authorization: localStorage.getItem('token'),
            id: id
          }
        );
        if (funcs.message) {
          setDeployedFunctions([]);
        } else {
          setDeployedFunctions(funcs);
        }
      } catch (error) {
        console.log('Error in fetching deployed OpenFaaS Functions', error);
      }
    };
    openFaaSFunctions();
    fetchFunctions();
  }, []);

  const handleDeployOpenFaaS = async () => {
    try {
      const getFunc = openFaaSFunctions.find(element => element.name === selectedOpenFaaSFunction);
      const body = {
        clusterId: id,
        service: selectedOpenFaaSFunction,
        image: getFunc?.images.x86_64
      };
      const response = await Post(apiRoute.getRoute('faas'), body, { authorization: localStorage.getItem('token') });
      if (response.success) {
        setRenderFunctions(!renderFunctions);
      }
    } catch (error) {
      console.log('Error in handleDeployOpenFaaS', error);
    }
  };

  const handleOpenFaaSFunctionsChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedOpenFaaSFunction(e.target.value);
  };

  const handleInvoke = async () => {
    try {
      const body = {
        clusterId: id,
        functionName: selectedDeployedFunction
      };
      const res = await Post(apiRoute.getRoute('faas/invoke'), body, { authorization: localStorage.getItem('token') });
      setInvokedOutput(res);
    } catch (error) {
      console.log('Error in handleInvoke', error);
    }
  };

  const handleDeployedFunctionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedDeployedFunction(e.target.value);
  };
  return (
    <div>
      <select onChange={handleOpenFaaSFunctionsChange} defaultValue="default">
        <option value="default">OpenFaaS Functions Store</option>
        {openFaaSFunctions.map((element, idx) => {
          return <option key={idx} value={element.name}>{element.name}</option>;
        })}
      </select>
      <button onClick={handleDeployOpenFaaS}>Deploy selected function from OpenFaaS function store</button>
      <div>
        <select onChange={handleDeployedFunctionChange} defaultValue="default">
          <option value="default">Deployed Functions</option>
          {deployedFunctions.map((element, idx) => {
            return <option key={idx} value={element.name}>{element.name}</option>;
          })}
        </select>
        <button onClick={handleInvoke}>Invoke selected function</button>
      </div>
      <div>
        {invokedOutput}
      </div>
    </div>
  );
};

export default OpenFaaS;
