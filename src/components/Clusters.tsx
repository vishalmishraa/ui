import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface ContextInfo {
  name: string;
  cluster: string;
}

const K8sInfo = () => {
  const [contexts, setContexts] = useState<ContextInfo[]>([]);
  const [clusters, setClusters] = useState<string[]>([]);
  const [currentContext, setCurrentContext] = useState<string>('');
  const [itsData, setItsData] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios.get('http://localhost:4000/api/clusters')
      .then(response => {
        setContexts(response.data.contexts);
        setClusters(response.data.clusters);
        setCurrentContext(response.data.currentContext);
        setItsData(response.data.itsData);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching Kubernetes information:', error);
        setError('Error fetching Kubernetes information');
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading Kubernetes information...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <div>
        <h2>Kubernetes Clusters ({clusters.length})</h2>
        <ul>
          {clusters.map(cluster => (
            <li key={cluster}>{cluster}</li>
          ))}
        </ul>
      </div>

      <div>
        <h2>Kubernetes Contexts ({contexts.length})</h2>
        <ul>
          {contexts.map(ctx => (
            <li key={ctx.name}>
              {ctx.name} {ctx.name === currentContext && '(Current)'} 
              <span style={{color: '#666'}}> → cluster: {ctx.cluster}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2>Current Context</h2>
        <p>{currentContext}</p>
      </div>

      <div>
        <h2>ITS Information</h2>
        <pre style={{ 
            textAlign: 'left', 
            padding: '1rem', 
            background: '#2d2d2d',  // Darker background
            color: '#ffffff',       // White text
            borderRadius: '4px',
            border: '1px solid #444' // Subtle border
        }}>
            {typeof itsData === 'object' ? JSON.stringify(itsData, null, 2) : itsData || 'No ITS data available'}
        </pre>
      </div>
    </div>
  );
};

export default K8sInfo;
