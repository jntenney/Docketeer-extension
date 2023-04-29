import React, { useState, useEffect } from 'react';
import styles from './Metrics.module.scss';
import useHelper from '../../helpers/commands';

const Metrics = (): JSX.Element => {
  const { getKey, getUid } = useHelper();
  const [kubernetesOrNah, setFrame] = useState(1);
  const [apiKey, setApiKey] = useState('');
  const [uidKey, setUidKey] = useState('');
  const [currentPage, setCurrentPage] = useState('Node Exporter / Nodes');
  const button = kubernetesOrNah === 1 ? 'Containers' : 'Kubernetes Cluster';

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const key = await getKey();
        setApiKey(key);
        const uid = await getUid(key, currentPage);
        setUidKey(uid);
      } catch (err) {
        console.log('Cannot get uid key or api key', err);
      }
    };
    fetchKey();
  }, []);

  const handleToggle = () => {
    setFrame((prevFrame) => (prevFrame === 1 ? 2 : 1));
  };

  const changePage = async (dashboard) => {
    setCurrentPage(dashboard);
    const uid = await getUid(apiKey, dashboard);
    setUidKey(uid);
  };

  return (
    <div className={styles.wrapper}>
      <h2>METRICS DASHBOARD</h2>
      <input
        type="checkbox"
        id="switch"
        className={styles.switch}
        onClick={handleToggle}
      />
      <>{button}</>
      <label className={styles.toggle} htmlFor="switch" />

      {kubernetesOrNah === 1 ? (
        <div>
          <iframe
            className={styles.metrics}
            src="http://localhost:2999/d/h5LcytHGz/system?orgId=1&refresh=10s&kiosk"
          />
        </div>
      ) : (
        <div>
          <button
            className={styles.button}
            onClick={() => changePage('Node Exporter / Nodes')}
          >
            Node
          </button>
          <button
            className={styles.button}
            onClick={() => changePage('Kubernetes / Kubelet')}
          >
            Kubelet
          </button>
          <iframe
            className={styles.metrics}
            src={`http://localhost:3000/d/${uidKey}/?orgId=1&refresh=10s&kiosk`}
          />
        </div>
      )}
    </div>
  );
};

export default Metrics;
