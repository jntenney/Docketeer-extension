import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../reducers/hooks';
import { setEndpointTypes, setPrometheusDataSources, addJobName } from '../reducers/configurationReducer';
import Client from '../models/Client';
import PromDataSource from '../components/Configuration/PromDataSource';
import ConfigurationForm from '../components/Configuration/ConfigurationForm';
import styles from './C.module.scss'
import { PromDataSourceType } from '../../../types';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const Configuration = (): React.JSX.Element => {
  const dispatch = useAppDispatch();

  // Set state of Prom Data Sources upon page load
  const promDataSourcesLength = useAppSelector(store => store.configuration.prometheusDataSources.length);
  const runningList = useAppSelector(store => store.containers.runningList);

  useEffect(() => {
    loadPromSources();
  }, []);

  async function loadPromSources() {
    // On load: clear datasource DB table
    await Client.ConfigService.clearDataSources();

    //  Grab new targets and parse into correctly formatted array
    const dataSources = await Client.ConfigService.getInitialSources();
    console.log('dataSources: ', dataSources);
    const parsedDataSources: PromDataSourceType[] = await Promise.all(
      dataSources.data.activeTargets.map(async (source, idx) => {
        // update datasource table in DB with new sources
        await Client.ConfigService.createDataSource(idx, source.labels.job, source.labels.instance);

        // add job name to list of job set for configuration form to choose from
        dispatch(addJobName(source.labels.job));

        return {
          id: idx,
          jobname: source.labels.job,
          url: source.labels.instance,
        };
      })
    );

    // set our data sources state as new parsed array
    dispatch(setPrometheusDataSources(parsedDataSources));
    
    // NOTE: currently stored in the SQL DB and in our redux state, but not used for anything
    const endpointTypes = await Client.ConfigService.getEndpointTypes();
    dispatch(setEndpointTypes(endpointTypes));
  }

  async function handleRefresh(e: React.MouseEvent<HTMLInputElement, MouseEvent>) {
    e.preventDefault();
    try {
      // grab ID of prometheus container to restart it
      const promContainer = runningList.find((container) => container.Names.includes('prometheus'));

      if (promContainer) {
        await Client.ContainerService.stopContainer(promContainer.ID);
        await Client.ContainerService.runContainer(promContainer.ID);
			  toast.success('Prometheus Reconfigured, Restarting...', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: false,
          draggable: true,
          progress: undefined,
          theme: 'dark',
        });
      } else {
        alert('Prometheus container not found.');
      }
    } catch (error) {
      console.error('Failed to refresh Prometheus container:', error);
      alert('Error refreshing Prometheus container.');
    }
  }

  // Child Elements for individual Configuration
  const dataSourceElements: React.JSX.Element[] = [];
  // Loop through to length of the promDataSource index, passing in the index
  for (let i = 0; i < promDataSourcesLength; i++){
    dataSourceElements.push(<PromDataSource key={`datasource_${i}`} index={i} />);
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.configurationsTitle}>CONFIGURATIONS</h1>
      <div className={styles.container}>
        <div>
          <ConfigurationForm />
        </div>
        <div>
          <h3>CONNECTED DATA SOURCES</h3>
          <input
            className={styles.Refresh}
            type='submit'
            value='Reconfigure Prometheus'
            onClick={handleRefresh}
          />
          <div className={styles.connected}>{dataSourceElements}</div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

export default Configuration;
