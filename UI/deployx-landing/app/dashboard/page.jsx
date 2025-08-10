'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Terminal, FolderOpen, Monitor, Network, Activity, Settings, Upload, Download, File, Folder, Play, Square, RotateCcw, Trash2, Edit, Plus, Search, Filter, ChevronRight, ChevronDown, Cpu, HardDrive, Wifi, Clock, Zap, X, Minimize2, Maximize2, History, FileText, Power, AlertCircle, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('overview')
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [terminalInput, setTerminalInput] = useState('')
  const [terminalHistory, setTerminalHistory] = useState([
    { type: 'system', text: 'DeployX Remote Shell v2.1.0 - Quantum Secure Connection Established', timestamp: '14:32:01' },
    { type: 'system', text: 'Connected to: production-server-01.deployx.ai', timestamp: '14:32:01' },
    { type: 'system', text: 'Session ID: qx-7f8a9b2c-secure', timestamp: '14:32:02' },
    { type: 'prompt', text: 'root@prod-srv-01:~$ ', timestamp: '14:32:02' }
  ])
  const [commandHistory, setCommandHistory] = useState(['ls -la', 'ps aux', 'top', 'systemctl status'])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [processes, setProcesses] = useState([
    { pid: 1234, name: 'nginx', cpu: 2.3, memory: 45.2, status: 'running', user: 'www-data' },
    { pid: 5678, name: 'mysql', cpu: 15.7, memory: 234.8, status: 'running', user: 'mysql' },
    { pid: 9012, name: 'node', cpu: 8.4, memory: 128.3, status: 'running', user: 'deploy' },
    { pid: 3456, name: 'redis', cpu: 1.2, memory: 67.4, status: 'running', user: 'redis' }
  ])
  const [services, setServices] = useState([
    { name: 'nginx', status: 'active', enabled: true, description: 'HTTP/HTTPS Web Server' },
    { name: 'mysql', status: 'active', enabled: true, description: 'MySQL Database Server' },
    { name: 'redis', status: 'active', enabled: true, description: 'In-Memory Data Store' },
    { name: 'ssh', status: 'active', enabled: true, description: 'Secure Shell Daemon' },
    { name: 'docker', status: 'inactive', enabled: false, description: 'Container Runtime' }
  ])
  const [fileSystem, setFileSystem] = useState([
    { name: 'home', type: 'folder', size: '-', modified: '2024-01-15', expanded: false },
    { name: 'var', type: 'folder', size: '-', modified: '2024-01-14', expanded: false },
    { name: 'etc', type: 'folder', size: '-', modified: '2024-01-13', expanded: false },
    { name: 'config.json', type: 'file', size: '2.4 KB', modified: '2024-01-15' },
    { name: 'deploy.log', type: 'file', size: '15.7 MB', modified: '2024-01-15' }
  ])
  
  const terminalRef = useRef(null)
  const inputRef = useRef(null)

  const sidebarItems = [
    { id: 'overview', label: 'System Overview', icon: Monitor },
    { id: 'shell', label: 'Remote Shell', icon: Terminal },
    { id: 'files', label: 'File Explorer', icon: FolderOpen },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'processes', label: 'Processes', icon: Activity },
    { id: 'services', label: 'Services', icon: Settings }
  ]

  const systemStats = {
    cpu: { usage: 23.4, cores: 8, model: 'Intel Xeon E5-2686 v4' },
    memory: { used: 6.2, total: 16, percentage: 38.75 },
    disk: { used: 245, total: 500, percentage: 49 },
    uptime: '15 days, 7 hours, 23 minutes',
    os: 'Ubuntu 22.04.3 LTS',
    kernel: '5.15.0-91-generic'
  }

  const networkInterfaces = [
    { name: 'eth0', ip: '10.0.1.45', mac: '02:42:ac:11:00:02', speed: '1000 Mbps', status: 'up' },
    { name: 'lo', ip: '127.0.0.1', mac: '00:00:00:00:00:00', speed: '-', status: 'up' },
    { name: 'docker0', ip: '172.17.0.1', mac: '02:42:7f:8a:9b:2c', speed: '10000 Mbps', status: 'up' }
  ]

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalHistory])

  const handleTerminalSubmit = (e) => {
    e.preventDefault()
    if (!terminalInput.trim()) return

    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false })
    
    // Add command to history
    setTerminalHistory(prev => [
      ...prev,
      { type: 'command', text: `root@prod-srv-01:~$ ${terminalInput}`, timestamp }
    ])

    // Add to command history
    setCommandHistory(prev => [terminalInput, ...prev.slice(0, 49)])
    
    // Simulate command execution
    setTimeout(() => {
      const mockOutput = generateMockOutput(terminalInput)
      setTerminalHistory(prev => [
        ...prev,
        ...mockOutput.map(line => ({ type: 'output', text: line, timestamp })),
        { type: 'prompt', text: 'root@prod-srv-01:~$ ', timestamp }
      ])
    }, 100)

    setTerminalInput('')
    setHistoryIndex(-1)
  }

  const generateMockOutput = (command) => {
    const cmd = command.toLowerCase().trim()
    
    if (cmd === 'ls' || cmd === 'ls -la') {
      return [
        'total 48',
        'drwxr-xr-x  8 root root 4096 Jan 15 14:32 .',
        'drwxr-xr-x 24 root root 4096 Jan 14 09:15 ..',
        '-rw-r--r--  1 root root 2847 Jan 15 14:30 config.json',
        'drwxr-xr-x  3 root root 4096 Jan 13 16:22 deploy',
        '-rw-r--r--  1 root root 15728640 Jan 15 14:32 deploy.log',
        'drwxr-xr-x  2 root root 4096 Jan 12 11:45 scripts'
      ]
    } else if (cmd === 'ps aux' || cmd === 'ps') {
      return [
        'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND',
        'root      1234  2.3  2.8 125432 45876 ?        Ssl  Jan14   1:23 nginx: master',
        'mysql     5678 15.7 14.7 2847392 234856 ?       Sl   Jan14  15:42 mysqld',
        'deploy    9012  8.4  8.0 1456789 128345 ?       Sl   14:30   0:45 node server.js',
        'redis     3456  1.2  4.2 567890 67432 ?         Ssl  Jan14   2:15 redis-server'
      ]
    } else if (cmd === 'top') {
      return [
        'top - 14:32:45 up 15 days,  7:23,  2 users,  load average: 0.23, 0.45, 0.67',
        'Tasks: 156 total,   2 running, 154 sleeping,   0 stopped,   0 zombie',
        '%Cpu(s):  23.4 us,  4.2 sy,  0.0 ni, 72.1 id,  0.3 wa,  0.0 hi,  0.0 si,  0.0 st',
        'MiB Mem :  16384.0 total,  10240.5 free,   6143.5 used,      0.0 buff/cache'
      ]
    } else if (cmd.startsWith('systemctl')) {
      return [
        '● nginx.service - The nginx HTTP and reverse proxy server',
        '   Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor preset: enabled)',
        '   Active: active (running) since Mon 2024-01-14 09:15:32 UTC; 1 day 5h ago',
        '     Docs: man:nginx(8)',
        '  Process: 1234 ExecStart=/usr/sbin/nginx (code=exited, status=0/SUCCESS)'
      ]
    } else if (cmd === 'whoami') {
      return ['root']
    } else if (cmd === 'pwd') {
      return ['/root']
    } else if (cmd === 'date') {
      return [new Date().toString()]
    } else if (cmd === 'clear') {
      setTerminalHistory([
        { type: 'prompt', text: 'root@prod-srv-01:~$ ', timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) }
      ])
      return []
    } else if (cmd === 'exit' || cmd === 'logout' || cmd === 'quit') {
      // Close terminal and return to dashboard
      setTimeout(() => {
        setTerminalOpen(false)
      }, 500)
      return ['Connection closed.', 'Goodbye!']
    } else {
      return [`bash: ${command}: command not found`]
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setTerminalInput(commandHistory[newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setTerminalInput(commandHistory[newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setTerminalInput('')
      }
    } else if (e.ctrlKey && e.key === 'd') {
      e.preventDefault()
      setTerminalOpen(false)
    }
  }

  const toggleService = (serviceName, action) => {
    setServices(prev => prev.map(service => 
      service.name === serviceName 
        ? { 
            ...service, 
            status: action === 'start' ? 'active' : action === 'stop' ? 'inactive' : service.status,
            enabled: action === 'enable' ? true : action === 'disable' ? false : service.enabled
          }
        : service
    ))
  }

  const killProcess = (pid) => {
    setProcesses(prev => prev.filter(process => process.pid !== pid))
  }

  const renderSystemOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CPU Card */}
        <Card className="bg-black/40 backdrop-blur-xl border border-blue-400/30 hover:border-blue-400/50 transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-blue-400 text-sm font-medium">
              <Cpu className="w-4 h-4 mr-2" />
              CPU Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">{systemStats.cpu.usage}%</span>
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${systemStats.cpu.usage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-400">{systemStats.cpu.cores} cores • {systemStats.cpu.model}</p>
            </div>
          </CardContent>
        </Card>

        {/* Memory Card */}
        <Card className="bg-black/40 backdrop-blur-xl border border-purple-400/30 hover:border-purple-400/50 transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-purple-400 text-sm font-medium">
              <Zap className="w-4 h-4 mr-2" />
              Memory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">{systemStats.memory.percentage}%</span>
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${systemStats.memory.percentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-400">{systemStats.memory.used}GB / {systemStats.memory.total}GB</p>
            </div>
          </CardContent>
        </Card>

        {/* Disk Card */}
        <Card className="bg-black/40 backdrop-blur-xl border border-cyan-400/30 hover:border-cyan-400/50 transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-cyan-400 text-sm font-medium">
              <HardDrive className="w-4 h-4 mr-2" />
              Disk Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">{systemStats.disk.percentage}%</span>
                <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-blue-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${systemStats.disk.percentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-400">{systemStats.disk.used}GB / {systemStats.disk.total}GB</p>
            </div>
          </CardContent>
        </Card>

        {/* Uptime Card */}
        <Card className="bg-black/40 backdrop-blur-xl border border-green-400/30 hover:border-green-400/50 transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-green-400 text-sm font-medium">
              <Clock className="w-4 h-4 mr-2" />
              System Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-white">15d 7h</span>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <p className="text-xs text-gray-400">{systemStats.uptime}</p>
              <p className="text-xs text-gray-400">{systemStats.os}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <Card className="bg-black/40 backdrop-blur-xl border border-blue-400/30">
        <CardHeader>
          <CardTitle className="text-blue-400">System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Operating System:</span>
                <span className="text-white">{systemStats.os}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Kernel Version:</span>
                <span className="text-white">{systemStats.kernel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Architecture:</span>
                <span className="text-white">x86_64</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Hostname:</span>
                <span className="text-white">prod-srv-01.deployx.ai</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Load Average:</span>
                <span className="text-white">0.23, 0.45, 0.67</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Boot Time:</span>
                <span className="text-white">2024-01-01 00:00:00</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderNetworkOverview = () => (
    <div className="space-y-6">
      <Card className="bg-black/40 backdrop-blur-xl border border-blue-400/30">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-400">
            <Network className="w-5 h-5 mr-2" />
            Network Interfaces
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Interface</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">IP Address</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">MAC Address</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Speed</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {networkInterfaces.map((iface, index) => (
                  <tr key={index} className="border-b border-gray-800 hover:bg-blue-500/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <Wifi className="w-4 h-4 mr-2 text-blue-400" />
                        <span className="text-white font-medium">{iface.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{iface.ip}</td>
                    <td className="py-3 px-4 text-gray-300 font-mono text-sm">{iface.mac}</td>
                    <td className="py-3 px-4 text-gray-300">{iface.speed}</td>
                    <td className="py-3 px-4">
                      <Badge className={`${iface.status === 'up' ? 'bg-green-500/20 text-green-400 border-green-400/50' : 'bg-red-500/20 text-red-400 border-red-400/50'}`}>
                        {iface.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderProcessManager = () => (
    <div className="space-y-6">
      <Card className="bg-black/40 backdrop-blur-xl border border-blue-400/30">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-blue-400">
            <div className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Process Manager
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">
              <Plus className="w-4 h-4 mr-1" />
              New Process
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">PID</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Process Name</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">CPU %</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Memory %</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">User</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((process) => (
                  <tr key={process.pid} className="border-b border-gray-800 hover:bg-blue-500/5 transition-colors">
                    <td className="py-3 px-4 text-white font-mono">{process.pid}</td>
                    <td className="py-3 px-4 text-white font-medium">{process.name}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <span className="text-white mr-2">{process.cpu}%</span>
                        <div className="w-16 bg-gray-800 rounded-full h-1">
                          <div 
                            className="bg-blue-400 h-1 rounded-full"
                            style={{ width: `${Math.min(process.cpu, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <span className="text-white mr-2">{process.memory}MB</span>
                        <div className="w-16 bg-gray-800 rounded-full h-1">
                          <div 
                            className="bg-purple-400 h-1 rounded-full"
                            style={{ width: `${Math.min(process.memory / 10, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{process.user}</td>
                    <td className="py-3 px-4">
                      <Badge className="bg-green-500/20 text-green-400 border-green-400/50">
                        {process.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => killProcess(process.pid)}
                        className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border-red-400/50"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderServiceManager = () => (
    <div className="space-y-6">
      <Card className="bg-black/40 backdrop-blur-xl border border-blue-400/30">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-400">
            <Settings className="w-5 h-5 mr-2" />
            Service Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-gray-700 hover:border-blue-400/50 transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${service.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                  <div>
                    <h3 className="text-white font-medium">{service.name}</h3>
                    <p className="text-gray-400 text-sm">{service.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={`${service.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-400/50' : 'bg-red-500/20 text-red-400 border-red-400/50'}`}>
                    {service.status}
                  </Badge>
                  <div className="flex space-x-1">
                    <Button 
                      size="sm" 
                      onClick={() => toggleService(service.name, service.status === 'active' ? 'stop' : 'start')}
                      className={`${service.status === 'active' ? 'bg-red-600/20 hover:bg-red-600/40 text-red-400 border-red-400/50' : 'bg-green-600/20 hover:bg-green-600/40 text-green-400 border-green-400/50'}`}
                    >
                      {service.status === 'active' ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => toggleService(service.name, 'restart')}
                      className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border-blue-400/50"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderFileExplorer = () => (
    <div className="space-y-6">
      <Card className="bg-black/40 backdrop-blur-xl border border-blue-400/30">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-blue-400">
            <div className="flex items-center">
              <FolderOpen className="w-5 h-5 mr-2" />
              File System Explorer
            </div>
            <div className="flex space-x-2">
              <Button size="sm" className="bg-green-600 hover:bg-green-500 text-white">
                <Upload className="w-4 h-4 mr-1" />
                Upload
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">
                <Plus className="w-4 h-4 mr-1" />
                New Folder
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {fileSystem.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 hover:bg-blue-500/5 rounded-lg transition-colors group">
                <div className="flex items-center space-x-3">
                  {item.type === 'folder' ? (
                    <Folder className="w-5 h-5 text-blue-400" />
                  ) : (
                    <File className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="text-white">{item.name}</span>
                  {item.type === 'file' && (
                    <span className="text-gray-400 text-sm">({item.size})</span>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-400 text-sm">{item.modified}</span>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="text-blue-400 hover:bg-blue-500/20">
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-yellow-400 hover:bg-yellow-500/20">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/20">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderTerminal = () => (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-full max-h-[90vh] bg-black/95 backdrop-blur-xl rounded-2xl border border-cyan-400/50 overflow-hidden shadow-2xl shadow-cyan-500/20">
        {/* Terminal Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border-b border-cyan-400/30">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex items-center space-x-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <span className="text-cyan-400 font-medium">DeployX Remote Shell</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="ghost" className="text-gray-400 hover:text-cyan-400">
              <History className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-gray-400 hover:text-cyan-400">
              <FileText className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setTerminalOpen(false)}
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-gray-400 hover:text-cyan-400">
              <Minimize2 className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-gray-400 hover:text-cyan-400">
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setTerminalOpen(false)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Terminal Content */}
        <div className="flex h-full">
          {/* Terminal Output */}
          <div className="flex-1 flex flex-col">
            <div 
              ref={terminalRef}
              className="flex-1 p-4 overflow-y-auto font-mono text-sm bg-black/50"
              style={{ 
                backgroundImage: `
                  radial-gradient(circle at 25% 25%, rgba(34, 211, 238, 0.03) 0%, transparent 50%),
                  linear-gradient(rgba(34, 211, 238, 0.02) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(34, 211, 238, 0.02) 1px, transparent 1px)
                `,
                backgroundSize: '200px 200px, 20px 20px, 20px 20px'
              }}
            >
              {terminalHistory.map((entry, index) => (
                <div key={index} className="mb-1 flex">
                  <span className="text-gray-500 text-xs mr-3 mt-0.5 min-w-[60px]">
                    {entry.timestamp}
                  </span>
                  <span className={`${
                    entry.type === 'system' ? 'text-cyan-400' :
                    entry.type === 'command' ? 'text-green-400' :
                    entry.type === 'output' ? 'text-gray-300' :
                    'text-blue-400'
                  }`}>
                    {entry.text}
                    {entry.type === 'prompt' && (
                      <span className="animate-pulse text-cyan-400">█</span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Terminal Input */}
            <form onSubmit={handleTerminalSubmit} className="p-4 bg-black/70 border-t border-cyan-400/30">
              <div className="flex items-center space-x-2">
                <span className="text-blue-400 font-mono text-sm">root@prod-srv-01:~$</span>
                <Input
                  ref={inputRef}
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent border-none text-green-400 font-mono focus:ring-0 focus:outline-none placeholder-gray-500"
                  placeholder="Enter command..."
                  autoComplete="off"
                  autoFocus
                />
              </div>
            </form>
          </div>

          {/* Terminal Sidebar */}
          <div className="w-64 bg-black/70 border-l border-cyan-400/30 p-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-cyan-400 font-medium mb-2 flex items-center">
                  <History className="w-4 h-4 mr-2" />
                  Command History
                </h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {commandHistory.slice(0, 10).map((cmd, index) => (
                    <button
                      key={index}
                      onClick={() => setTerminalInput(cmd)}
                      className="block w-full text-left text-xs text-gray-400 hover:text-cyan-400 p-1 rounded hover:bg-cyan-500/10 transition-colors font-mono"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-cyan-400 font-medium mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Quick Commands
                </h3>
                <div className="space-y-1">
                  {['ls -la', 'ps aux', 'top', 'df -h', 'free -m', 'systemctl status', 'exit'].map((cmd, index) => (
                    <button
                      key={index}
                      onClick={() => setTerminalInput(cmd)}
                      className={`block w-full text-left text-xs p-1 rounded transition-colors font-mono ${
                        cmd === 'exit' 
                          ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' 
                          : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10'
                      }`}
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-cyan-400 font-medium mb-2">Session Info</h3>
                <div className="space-y-1 text-xs text-gray-400">
                  <div>Host: prod-srv-01</div>
                  <div>User: root</div>
                  <div>Shell: /bin/bash</div>
                  <div className="flex items-center">
                    Status: 
                    <div className="w-2 h-2 bg-green-400 rounded-full ml-2 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, rgba(34, 211, 238, 0.1) 0%, transparent 50%),
              linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '400px 400px, 400px 400px, 40px 40px, 40px 40px'
          }}></div>
        </div>
      </div>

      <div className="relative z-10 flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen bg-black/60 backdrop-blur-xl border-r border-blue-400/30">
          <div className="p-6">
            <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-8">
              DeployX Admin
            </div>
            
            <nav className="space-y-2">
              {sidebarItems.map((item) => {
                const IconComponent = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'shell') {
                        setTerminalOpen(true)
                      } else {
                        setActiveSection(item.id)
                      }
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                      activeSection === item.id
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-400/50'
                        : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span>{item.label}</span>
                    {item.id === 'shell' && (
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse ml-auto"></div>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {activeSection === 'overview' && renderSystemOverview()}
            {activeSection === 'network' && renderNetworkOverview()}
            {activeSection === 'processes' && renderProcessManager()}
            {activeSection === 'services' && renderServiceManager()}
            {activeSection === 'files' && renderFileExplorer()}
          </div>
        </div>
      </div>

      {/* Terminal Modal */}
      {terminalOpen && renderTerminal()}
    </div>
  )
}
