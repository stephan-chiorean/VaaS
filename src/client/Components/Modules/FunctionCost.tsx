import React, { useState, useEffect, ChangeEvent } from 'react';
import { Modules } from '../../Interfaces/ICluster';
import openFaasMetric from '../../Queries/OpenFaaS';
import { useAppSelector } from '../../Store/hooks';
import { IReducers } from '../../Interfaces/IReducers';
import {
  Container,
  TextField,
  Button,
  Box,
  FormControl,
  NativeSelect,
} from '@mui/material';
import { functionCost } from '../../utils';
import { setDefaultResultOrder } from 'dns/promises';

const FunctionCost = (props: Modules) => {
  const OFReducer = useAppSelector((state: IReducers) => state.OFReducer);
  const deployedFunctions = OFReducer.deployedFunctions || [];
  const [selectedDeployedFunction, setSelectedDeployedFunction] = useState('');
  const [data, setData] = useState({ value: 0 });
  const [retrived, setRetrived] = useState(false);
  const [fields, setFields] = useState({
    numInvocation: 0,
    estExecTime: 0,
    memoryMbs: 0,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const {
      target: { name, value },
    } = e;
    setFields({ ...fields, [name]: Number(value) });
  };

  //remove previous session storage on first page load
  window.onbeforeunload = function () {
    sessionStorage.clear();
  };

  const [responseStyle, setResponseStyle] = useState({
    color: 'white',
    height: '280px',
  });

  const googleGBGHzMap: { [key: string]: any } = {
    128: 200,
    256: 400,
    512: 800,
    1024: 1400,
    2048: 2400,
  };

  useEffect(() => {
    if (!props.nested) {
      setResponseStyle({
        ...responseStyle,
        color: '#F0F0F0',
        height: '65vh',
      });
    }
  }, []);
  useEffect(() => {
    console.log('DATA IS: ', data);
  }, [data]);

  // pick the function we want to see
  const handleDeployedFunctionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedDeployedFunction(e.target.value);
  };

  // fetch data from prom: time it takes for exection, invocation amount
  const handleFunctionData = async () => {
    try {
      console.log('CLICKEDDDDD');
      const type = 'avg';
      const query = `gateway_functions_seconds_sum{function_name="${selectedDeployedFunction}.openfaas-fn"}/gateway_function_invocation_total{function_name="${selectedDeployedFunction}.openfaas-fn"}`;
      const data = await openFaasMetric.avgTimePerInvoke(
        props.id as string,
        type,
        query
      );

      if (!isNaN(Number(data.value))) {
        data.value = `The average time needed to invoke function is ${Number(
          data.value
        ).toFixed(4)} seconds`;
        console.log(data.vlaue);
        setData(data);
        setRetrived(true);
      } else {
        data.value = 'Please invoke function first!';
        console.log(data.vlaue);
        setData(data);
        setRetrived(true);
      }
    } catch (error) {
      console.log('ERROR IN handleFunctionData: ', error);
    }
  };

  const displayFunctionData = (name: string) => {
    return deployedFunctions.find((element) => element.name === name);
  };

  const vendorFuncCost = (
    invokeAmount: number,
    invokeTime: number,
    memory: number,
    resultType: string,
    vendor: string
  ) => {
    switch (vendor) {
      case 'aws': {
        if (invokeAmount > functionCost.lambdaFreeRequests) {
          const requestTimesTime =
            (invokeAmount - functionCost.lambdaFreeRequests) *
            (invokeTime / 1000);
          const computeInsec = Math.max(requestTimesTime, 0);
          // console.log(computeInsec);
          const totalComputeGBSeconds = computeInsec * (memory / 1024);
          // console.log('total seconds:', totalComputeGBSeconds);
          const billableCompute = Math.max(
            totalComputeGBSeconds - functionCost.lambdaFreeTier,
            0
          );
          const bill = billableCompute * functionCost.lambdaChargeGBSecond;
          console.log('BILL WITH SECONDS IS', bill);
          // console.log('functionCost', functionCost.lambdaRequestCharge)
          const requestCharge: number =
            (invokeAmount - functionCost.lambdaFreeRequests) *
            (functionCost.lambdaRequestCharge / 1000000);
          // console.log(`invoked amount: ${invokeAmount},minus freetier amount: ${functionCost.lambdaFreeRequests}, times charge per request ${functionCost.lambdaRequestCharge / 1000000}`);
          // console.log('REQ CHARGE TOT:' , requestCharge)
          const totalCost: string = (requestCharge + bill).toFixed(2);
          const result = {
            requestCharge: requestCharge,
            computeCost: bill,
            total: totalCost,
          };
          console.log('THIS IS THE RESULT', result);
          // console.log(totalCost);
          // console.log('****************');
          switch (resultType) {
            case 'reqCharge': {
              return result.requestCharge.toFixed(2);
            }
            case 'computeCost': {
              return result.computeCost.toFixed(2);
            }
            case 'total': {
              return result.total;
            }
          }
        } else return 0;
        break;
      }
      case 'azure': {
        if (invokeAmount > functionCost.azureFreeRequests) {
          // console.log('AZURE BILLIBLE: ', invokeAmount - functionCost.azureFreeRequests)
          const requestTimesTime =
            (invokeAmount - functionCost.azureFreeRequests) *
            (invokeTime / 1000);
          // console.log('REQUEST TIMES TIME FOR AZURE: ', requestTimesTime)
          const computeInsec = Math.max(requestTimesTime, 0);
          // console.log(computeInsec);
          console.log('Azure:', computeInsec);

          const totalComputeGBSeconds = computeInsec * (memory / 1024);
          const billableCompute = Math.max(
            totalComputeGBSeconds - functionCost.azureFreeTier,
            0
          );
          // console.log('total seconds:', totalComputeGBSeconds);
          const bill = billableCompute * functionCost.azureChargeGBSecond;
          // console.log('BILL WITH SECONDS IS', bill)
          // console.log('functionCost', functionCost.lambdaRequestCharge)
          const requestCharge: number =
            (invokeAmount - functionCost.azureFreeRequests) *
            (functionCost.azureRequestCharge / 1000000);
          // console.log(`invoked amount: ${invokeAmount},minus freetier amount: ${functionCost.lambdaFreeRequests}, times charge per request ${functionCost.lambdaRequestCharge / 1000000}`);
          // console.log('REQ CHARGE TOT:' , requestCharge)
          console.log('*************');
          const totalCost: string = (requestCharge + bill).toFixed(2);
          const result = {
            requestCharge: requestCharge,
            computeCost: bill,
            total: totalCost,
          };
          // console.log(totalCost);
          // console.log('****************');
          switch (resultType) {
            case 'reqCharge': {
              return result.requestCharge.toFixed(2);
            }
            case 'computeCost': {
              return result.computeCost.toFixed(2);
            }
            case 'total': {
              return result.total;
            }
          }
        } else return 0;
        break;
      }
      case 'gCloud': {
        if (invokeAmount > functionCost.googleFreeRequests) {
          const requestTimesTime = invokeAmount * (invokeTime / 1000);
          const computeInsec = Math.max(requestTimesTime, 0);
          const totalComputeGBSeconds = computeInsec * (memory / 1024);

          const billableCompute = Math.max(
            totalComputeGBSeconds - functionCost.googleGBSecondFreeTier,
            0
          );
          const googCPU: number = googleGBGHzMap[memory];
          console.log(googCPU, 'IT IS');
          let bill = null;
          if (!googCPU) {
            bill = billableCompute * functionCost.googleChargeGBSecond;
            console.log('HELLO');
          } else {
            const totalComputeGHzSeconds =
              totalComputeGBSeconds * (googCPU / 1000);
            // console.log('CPU SECS', totalComputeGHzSeconds)
            const billableCPU = Math.max(
              totalComputeGHzSeconds - functionCost.googleGHzSecondFreeTier,
              0
            );
            // console.log('BILLABLE CPU', billableCPU)
            bill =
              billableCompute * functionCost.googleChargeGBSecond +
              billableCPU * functionCost.googleChargeGHzSecond;
            // console.log(`old cost without CPU: ${billableCompute * functionCost.googleChargeGBSecond}, newCost = ${bill}`)
          }
          // console.log(` BILL IS : ${billableCompute} + ${functionCost.googleChargeGBSecond} = ${bill}`);
          // console.log('functionCost', functionCost.lambdaRequestCharge)
          const requestCharge: number =
            (invokeAmount - functionCost.googleFreeRequests) *
            (functionCost.googleRequestCharge / 1000000);
          // console.log(`invoked amount: ${invokeAmount},minus freetier amount: ${functionCost.lambdaFreeRequests}, times charge per request ${functionCost.lambdaRequestCharge / 1000000}`);
          // console.log('REQ CHARGE TOT:' , requestCharge)
          const totalCost: string = (requestCharge + bill).toFixed(2);
          const result = {
            requestCharge: requestCharge,
            computeCost: bill,
            total: totalCost,
          };
          // console.log(totalCost);
          // console.log('****************');
          switch (resultType) {
            case 'reqCharge': {
              return result.requestCharge.toFixed(2);
            }
            case 'computeCost': {
              return result.computeCost.toFixed(2);
            }
            case 'total': {
              return result.total;
            }
          }
        } else return 0;
        break;
      }
      case 'ibm': {
        if (invokeAmount > functionCost.ibmFreeRequests) {
          const requestTimesTime =
            (invokeAmount - functionCost.ibmFreeRequests) * (invokeTime / 1000);
          const computeInsec = Math.max(requestTimesTime, 0);
          // console.log(computeInsec);
          const totalComputeGBSeconds = computeInsec * (memory / 1024);
          // console.log('total seconds:', totalComputeGBSeconds);
          const billableCompute = Math.max(
            totalComputeGBSeconds - functionCost.ibmFreeTier,
            0
          );

          const bill = billableCompute * functionCost.ibmChargeGBSecond;
          // console.log('BILL WITH SECONDS IS', bill)
          // console.log('functionCost', functionCost.lambdaRequestCharge)
          console.log(
            'invoke amount:',
            invokeAmount,
            'freeReqs',
            functionCost.ibmFreeRequests,
            'ibmReqCharge:',
            functionCost.ibmRequestCharge
          );
          const requestCharge: number =
            (invokeAmount - functionCost.ibmFreeRequests) *
            (functionCost.ibmRequestCharge / 1000000);
          // console.log(`invoked amount: ${invokeAmount},minus freetier amount: ${functionCost.lambdaFreeRequests}, times charge per request ${functionCost.lambdaRequestCharge / 1000000}`);
          // console.log('REQ CHARGE TOT:' , requestCharge)
          const totalCost: string = (requestCharge + bill).toFixed(2);
          console.log('ibm requestCharge:', requestCharge);
          const result = {
            requestCharge: requestCharge,
            computeCost: bill,
            total: totalCost,
          };

          switch (resultType) {
            case 'reqCharge': {
              return result.requestCharge.toFixed(2);
            }
            case 'computeCost': {
              return result.computeCost.toFixed(2);
            }
            case 'total': {
              return result.total;
            }
          }
        } else return 0;
        break;
      }
    }
  };
  return (
    <Container
      sx={{
        width: '100%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          //gap: '1.5rem',
          marginLeft: '-1rem',
          marginTop: '8px',
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <FormControl
            fullWidth
            sx={{
              background: 'white',
              borderRadius: '5px',
              padding: '0.5rem',
              marginBottom: '0px',
              width: '75%',
              fontSize: '10px',
            }}
          >
            <NativeSelect
              placeholder="Select OpenFaaS function"
              inputProps={{
                name: 'Deployed Functions',
                id: 'uncontrolled-native',
              }}
              onChange={handleDeployedFunctionChange}
            >
              <option value="">--Select OpenFaaS Function--</option>
              {deployedFunctions.map((element, idx) => {
                return (
                  <option key={idx} value={element.name}>
                    {element.name}
                  </option>
                );
              })}
            </NativeSelect>
          </FormControl>
          <Button
            variant="contained"
            className="btn"
            type="button"
            onClick={handleFunctionData}
            sx={
              props.isDark
                ? {
                    color: 'black',
                    background: '#c0c0c0',
                    borderRadius: '5px',
                    marginBottom: '20px',
                    width: '25%',
                    height: '2.5vh',
                    fontSize: '12px',
                    marginLeft: '0.5rem',
                  }
                : {
                    color: 'white',
                    background: '#3a4a5b',
                    borderRadius: '5px',
                    marginBottom: '20px',
                    width: '25%',
                    height: '2.5vh',
                    fontSize: '12px',
                    marginLeft: '0.5rem',
                  }
            }
          >
            Calculate
          </Button>
        </Box>
        <Box
          sx={
            props.isDark
              ? {
                  width: '100%',
                  display: 'flex',
                  fontSize: '16px',
                  flexDirection: 'column',
                  gap: '1.5rem',
                  marginLeft: '-1rem',
                  marginTop: '8px',
                  justifyContent: 'center',
                  backgroundColor: '#F0F0F0',
                  color: '#5B5B5B',
                  borderRadius: '5px',
                  marginRight: '3px',
                  marginBottom: '0px',
                }
              : {
                  width: '100%',
                  display: 'flex',
                  fontSize: '16px',
                  flexDirection: 'column',
                  gap: '1.5rem',
                  marginLeft: '-1rem',
                  marginTop: '8px',
                  justifyContent: 'center',
                  backgroundColor: '#F0F0F0',
                  color: '#5B5B5B',
                  borderRadius: '5px',
                  marginRight: '3px',
                  marginBottom: '0px',
                }
          }
        >
          {/* <div>THIS IS SELECTED {selectedDeployedFunction}</div> */}
          {/* {
            data.value &&
            <div>THIS IS THE VALUE { data. value}</div>
          }
           */}
          {retrived && (
            <div>
              <div>{data.value} </div>
              <div>
                This function has been invoked{' '}
                {displayFunctionData(selectedDeployedFunction)
                  ?.invocationCount || 0}{' '}
                times
              </div>
            </div>
          )}

          <div>
            <h4>Estimated cost of deployment:</h4>
            <form className="costCal">
              <TextField
                size="small"
                id="invocation-input"
                label="# of invocation"
                variant="filled"
                name="numInvocation"
                onChange={(e) => handleChange(e)}
              ></TextField>
              <TextField
                size="small"
                id="estimated-exec-time"
                label="Estimated Execution Time (ms)"
                variant="filled"
                name="estExecTime"
                onChange={(e) => handleChange(e)}
              ></TextField>

              <TextField
                size="small"
                id="memory-mbs"
                label="memory in mbs"
                variant="filled"
                name="memoryMbs"
                onChange={(e) => handleChange(e)}
              ></TextField>
            </form>
            <br />
            <div>
              {' '}
              PLEASE NOTE BELOW COST DOES NOT INCLUDE CPU COMPUTING COST YET.
              STAY TUNED FOR MORE
            </div>
            <table
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <tbody>
                <tr>
                  <th>Vendor</th>
                  <th>Request Cost</th>
                  <th>Compute Cost</th>
                  <th>Total</th>
                </tr>
                <tr>
                  <td>AWS Lambda</td>
                  <td>
                    $
                    <span id="lambda-request-cost">
                      {vendorFuncCost(
                        fields.numInvocation,
                        fields.estExecTime,
                        fields.memoryMbs,
                        'reqCharge',
                        'aws'
                      )}
                    </span>
                  </td>
                  <td>
                    $
                    <span id="lambda-execution-cost">
                      {vendorFuncCost(
                        fields.numInvocation,
                        fields.estExecTime,
                        fields.memoryMbs,
                        'computeCost',
                        'aws'
                      )}
                    </span>
                  </td>
                  <th>
                    $
                    <span id="lambda-total-cost">
                      {vendorFuncCost(
                        fields.numInvocation,
                        fields.estExecTime,
                        fields.memoryMbs,
                        'total',
                        'aws'
                      )}
                    </span>
                  </th>
                </tr>
                <tr>
                  <td>Azure Functions</td>
                  <td>
                    $
                    <span id="azure-request-cost">
                      {vendorFuncCost(
                        fields.numInvocation,
                        fields.estExecTime,
                        fields.memoryMbs,
                        'reqCharge',
                        'azure'
                      )}
                    </span>
                  </td>
                  <td>
                    $
                    <span id="azure-execution-cost">
                      {vendorFuncCost(
                        fields.numInvocation,
                        fields.estExecTime,
                        fields.memoryMbs,
                        'computeCost',
                        'azure'
                      )}
                    </span>
                  </td>
                  <th>
                    $
                    <span id="azure-total-cost">
                      {vendorFuncCost(
                        fields.numInvocation,
                        fields.estExecTime,
                        fields.memoryMbs,
                        'total',
                        'azure'
                      )}
                    </span>
                  </th>
                </tr>
                <tr>
                  <td>Google Cloud Functions</td>
                  <td>
                    $
                    <span id="google-request-cost">
                      {vendorFuncCost(
                        fields.numInvocation,
                        fields.estExecTime,
                        fields.memoryMbs,
                        'reqCharge',
                        'gCloud'
                      )}
                    </span>
                  </td>
                  <td>
                    $
                    <span id="google-execution-cost">
                      {vendorFuncCost(
                        fields.numInvocation,
                        fields.estExecTime,
                        fields.memoryMbs,
                        'computeCost',
                        'gCloud'
                      )}
                    </span>
                  </td>
                  <th>
                    $
                    <span id="google-total-cost">
                      {vendorFuncCost(
                        fields.numInvocation,
                        fields.estExecTime,
                        fields.memoryMbs,
                        'total',
                        'gCloud'
                      )}
                    </span>
                  </th>
                </tr>
                <tr>
                  <td>IBM OpenWhisk</td>
                  <td>
                    $
                    <span id="ibm-request-cost">
                      {vendorFuncCost(
                        fields.numInvocation,
                        fields.estExecTime,
                        fields.memoryMbs,
                        'reqCharge',
                        'ibm'
                      )}
                    </span>
                  </td>
                  <td>
                    $
                    <span id="ibm-execution-cost">
                      {vendorFuncCost(
                        fields.numInvocation,
                        fields.estExecTime,
                        fields.memoryMbs,
                        'computeCost',
                        'ibm'
                      )}
                    </span>
                  </td>
                  <th>
                    $
                    <span id="ibm-total-cost">
                      {vendorFuncCost(
                        fields.numInvocation,
                        fields.estExecTime,
                        fields.memoryMbs,
                        'total',
                        'ibm'
                      )}
                    </span>
                  </th>
                </tr>
              </tbody>
            </table>
          </div>
        </Box>
      </Box>
    </Container>
  );
};
export default FunctionCost;
