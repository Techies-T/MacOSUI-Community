import React, { useState, useEffect } from 'react';

const AppRunnerDashboard = ({ windowId }) => {
  const [services, setServices] = useState([]);
  const [selectedServiceArn, setSelectedServiceArn] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch Services on Mount
  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/mcp/tool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'get_apprunner_services' })
        });
        
        if (!res.ok) {
           const errText = await res.text();
           throw new Error(`Failed to fetch services: ${errText}`);
        }
        
        const data = await res.json();
        
        // Handle MCP Text Content format
        let servicesData = [];
        if (data.content && data.content[0] && data.content[0].text) {
             servicesData = JSON.parse(data.content[0].text);
        } else {
             servicesData = data;
        }

        setServices(servicesData);
        if (servicesData.length > 0) {
            setSelectedServiceArn(servicesData[0].ServiceArn);
        }
      } catch (err) {
        console.error("Error fetching App Runner services:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  // Poll Metrics when a service is selected
  useEffect(() => {
    if (!selectedServiceArn) return;

    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/mcp/tool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              name: 'get_apprunner_metrics',
              args: { serviceArn: selectedServiceArn }
          })
        });
        
        if (!res.ok) {
           throw new Error(`Failed to fetch metrics: ${res.status}`);
        }
        
        const data = await res.json();
        
         // Handle MCP Text Content format
        let metricsData = null;
        if (data.content && data.content[0] && data.content[0].text) {
             metricsData = JSON.parse(data.content[0].text);
        } else {
             metricsData = data;
        }

        setMetrics(metricsData);
        setLastUpdated(new Date());
        setError(''); // clear error if successful
      } catch (err) {
        console.error("Error fetching metrics:", err);
        // We don't necessarily want to blow away the UI on a single failed poll, 
        // but we should show a warning indicator.
        setError(err.message);
      }
    };

    fetchMetrics(); // Fetch immediately
    const interval = setInterval(fetchMetrics, 5000); // And then every 5 seconds

    return () => clearInterval(interval);
  }, [selectedServiceArn]);

  const selectedServiceDetails = services.find(s => s.ServiceArn === selectedServiceArn);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 font-sans p-4 overflow-y-auto w-full select-text">
      
      {/* Header & Controls */}
      <div className="mb-6 bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700 flex flex-col gap-3">
         <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                App Runner Monitor
            </h2>
            <div className="text-xs text-slate-400">
                Instance: {windowId.substring(0, 5)}
            </div>
         </div>

        {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-3 py-2 rounded text-xs mb-2">
                {error}
            </div>
        )}

        <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-300">Service:</span>
            {loading && !services.length ? (
                <span className="text-sm text-slate-400 animate-pulse">Loading services...</span>
            ) : (
                <select 
                    className="flex-1 bg-slate-950 border border-slate-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 appearance-none"
                    value={selectedServiceArn}
                    onChange={(e) => setSelectedServiceArn(e.target.value)}
                >
                    {services.map(s => (
                        <option key={s.ServiceArn} value={s.ServiceArn}>
                            {s.ServiceName} ({s.Status})
                        </option>
                    ))}
                    {services.length === 0 && <option value="">No services found</option>}
                </select>
            )}
        </div>
      </div>

      {/* Main Content Area */}
      {selectedServiceArn ? (
          <div className="flex-1 flex flex-col gap-4">
              
              {/* Service Status Overview */}
              {selectedServiceDetails && (
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex justify-between items-center shadow-md">
                      <div>
                          <div className="text-xs text-slate-400 mb-1">Status</div>
                          <div className="flex items-center gap-2">
                             <span className={`w-3 h-3 rounded-full ${selectedServiceDetails.Status === 'RUNNING' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'}`}></span>
                             <span className="font-mono text-lg font-bold">{selectedServiceDetails.Status}</span>
                          </div>
                      </div>
                      <div className="text-right">
                          <div className="text-xs text-slate-400 mb-1">Last Updated</div>
                          <div className="text-sm font-mono text-slate-300">
                              {lastUpdated ? lastUpdated.toLocaleTimeString() : '--:--:--'}
                          </div>
                      </div>
                  </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                  
                  {/* CPU Usage */}
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-md">
                      <div className="text-xs text-slate-400 mb-2 flex justify-between">
                          <span>CPU Utilization</span>
                          <span className="text-emerald-400">{metrics?.cpuUtilization != null ? metrics.cpuUtilization.toFixed(1) : '--'}%</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-4 overflow-hidden border border-slate-700">
                          <div 
                             className="bg-emerald-500 h-4 transition-all duration-500 ease-in-out" 
                             style={{ width: `${Math.min(metrics?.cpuUtilization || 0, 100)}%` }}
                          ></div>
                      </div>
                  </div>

                  {/* Memory Usage */}
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-md">
                      <div className="text-xs text-slate-400 mb-2 flex justify-between">
                          <span>Memory Utilization</span>
                          <span className="text-blue-400">{metrics?.memoryUtilization != null ? metrics.memoryUtilization.toFixed(1) : '--'}%</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-4 overflow-hidden border border-slate-700">
                          <div 
                             className="bg-blue-500 h-4 transition-all duration-500 ease-in-out" 
                             style={{ width: `${Math.min(metrics?.memoryUtilization || 0, 100)}%` }}
                          ></div>
                      </div>
                  </div>
                  
                  {/* Requests */}
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-md flex flex-col justify-center items-center">
                      <div className="text-xs text-slate-400 mb-1">Requests (5m)</div>
                      <div className="text-3xl font-bold text-slate-100 font-mono">
                          {metrics?.requests != null ? metrics.requests.toLocaleString() : '--'}
                      </div>
                  </div>

                  {/* Errors */}
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-md flex flex-col justify-center items-center">
                      <div className="text-xs text-slate-400 mb-1">5xx Errors (5m)</div>
                      <div className={`text-3xl font-bold font-mono ${metrics?.errors5xx > 0 ? 'text-red-500' : 'text-slate-100'}`}>
                          {metrics?.errors5xx != null ? metrics.errors5xx.toLocaleString() : '--'}
                      </div>
                  </div>

              </div>

          </div>
      ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm italic">
              Select an App Runner service to view metrics.
          </div>
      )}

    </div>
  );
};

export default AppRunnerDashboard;
