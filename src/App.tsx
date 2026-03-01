import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ConnectionMode,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import SwitchNode from './components/SwitchNode';
import DeviceNode from './components/DeviceNode';
import GroupNode from './components/GroupNode';
import DynamicEdge from './components/DynamicEdge';
import PatchPanelNode from './components/PatchPanelNode';
import { Plus, Server, Monitor, Info, ChevronDown, Shield, Printer, Router, Wifi, HardDrive, Database, Settings, Save, DownloadCloud, UploadCloud, Camera, Trash2, Activity, Cloud, Layers, Globe, Phone, ArrowRightLeft, Laptop, SquareDashed, Menu, X, GripHorizontal } from 'lucide-react';
import { toPng } from 'html-to-image';

const nodeTypes = {
  switch: SwitchNode,
  device: DeviceNode, // use generic device component
  pc: DeviceNode, // fallback for any existing nodes in memory
  group: GroupNode,
  patchpanel: PatchPanelNode,
};

const edgeTypes = {
  dynamic: DynamicEdge,
};

const defaultEdgeOptions = {
  style: { strokeWidth: 2, stroke: '#64748b' },
  type: 'dynamic',
};



const DEVICES = [
  { id: 'pc', nameKey: 'dev.pc', icon: Monitor, color: 'text-blue-400', label: 'PC', defaultPorts: 1 },
  { id: 'laptop', nameKey: 'dev.laptop', icon: Laptop, color: 'text-blue-300', label: 'Laptop', defaultPorts: 1 },
  { id: 'server', nameKey: 'dev.server', icon: Database, color: 'text-emerald-400', label: 'Serwer', defaultPorts: 2 },
  { id: 'firewall', nameKey: 'dev.firewall', icon: Shield, color: 'text-red-400', label: 'Firewall', defaultPorts: 4 },
  { id: 'router', nameKey: 'dev.router', icon: Router, color: 'text-green-400', label: 'Router', defaultPorts: 4 },
  { id: 'wifi', nameKey: 'dev.wifi', icon: Wifi, color: 'text-purple-400', label: 'WLAN', defaultPorts: 1 },
  { id: 'mediaconverter', nameKey: 'dev.mediaconverter', icon: ArrowRightLeft, color: 'text-teal-400', label: 'Media Conv.', defaultPorts: 2 },
  { id: 'voip', nameKey: 'dev.voip', icon: Phone, color: 'text-orange-400', label: 'VoIP', defaultPorts: 1 },
  { id: 'printer', nameKey: 'dev.printer', icon: Printer, color: 'text-amber-400', label: 'Drukarka', defaultPorts: 1 },
  { id: 'isp', nameKey: 'dev.isp', icon: Globe, color: 'text-indigo-400', label: 'ISP', defaultPorts: 1 },
  { id: 'nas', nameKey: 'dev.nas', icon: HardDrive, color: 'text-rose-400', label: 'NAS', defaultPorts: 1 },
];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [selectedDeviceData, setSelectedDeviceData] = useState<{
    id: string;
    deviceName: string;
    connectedTo: string;
    port: string;
    icon: any;
    info: string;
    ip: string;
    mac: string;
    customName: string;
    isEdge?: boolean;
    sourceNodeId?: string;
    targetNodeId?: string;
    vms?: { id: string; name: string; ip: string; isOnline?: boolean }[];
    deviceType?: string;
  } | null>(null);

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [tempInfo, setTempInfo] = useState('');
  const [tempIp, setTempIp] = useState('');
  const [tempMac, setTempMac] = useState('');
  const [tempCustomName, setTempCustomName] = useState('');
  const [tempVms, setTempVms] = useState<{ id: string; name: string; ip: string; isOnline?: boolean }[]>([]);

  const [lang, setLang] = useState('en');
  const [t, setT] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/locales/${lang}.json`)
      .then(r => r.json())
      .then(data => setT(data))
      .catch(err => console.error("Could not load translations", err));
  }, [lang]);

  const getText = useCallback((key: string) => {
    return t[key] || key;
  }, [t]);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nodesRef = useRef(nodes);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    const checkPing = async () => {
      const currentNodes = nodesRef.current;
      const ipsToPing: { id: string, ip: string, vmId?: string }[] = [];

      currentNodes.forEach(n => {
        if (n.data.ip) ipsToPing.push({ id: n.id, ip: n.data.ip as string });
        if (n.data.vms && Array.isArray(n.data.vms)) {
          n.data.vms.forEach((vm: any) => {
            if (vm.ip) ipsToPing.push({ id: n.id, ip: vm.ip, vmId: vm.id });
          });
        }
      });

      if (ipsToPing.length === 0) return;

      const results = await Promise.all(ipsToPing.map(async ({ id, ip, vmId }) => {
        try {
          const res = await fetch(`/api/ping?ip=${ip}`);
          if (!res.ok) throw new Error('Not ok');
          const data = await res.json();
          return { id, vmId, isOnline: data.online };
        } catch {
          return { id, vmId, isOnline: false };
        }
      }));

      setNodes((prevNodes) => prevNodes.map((n) => {
        let changed = false;
        const newN = { ...n, data: { ...n.data } };

        const myNodeResults = results.filter(r => r.id === n.id);
        const mainRes = myNodeResults.find(r => !r.vmId);

        if (mainRes && newN.data.isOnline !== mainRes.isOnline) {
          newN.data.isOnline = mainRes.isOnline;
          changed = true;
        }

        if (newN.data.vms && Array.isArray(newN.data.vms)) {
          const newVms = newN.data.vms.map(vm => {
            const vmRes = myNodeResults.find(r => r.vmId === vm.id);
            if (vmRes && vm.isOnline !== vmRes.isOnline) {
              changed = true;
              return { ...vm, isOnline: vmRes.isOnline };
            }
            return vm;
          });
          if (changed) newN.data.vms = newVms;
        }

        return changed ? newN : n;
      }));
    };

    const intervalId = setInterval(checkPing, 5000);
    // Option to run immediately - could slow down initial render if there are many nodes, but reasonable here
    checkPing();

    return () => clearInterval(intervalId);
  }, [setNodes]);

  useEffect(() => {
    fetch('/api/load')
      .then(res => res.json())
      .then(data => {
        if (data && data.nodes && data.edges) {
          const patchedNodes = data.nodes.map((n: Node) => {
            if (n.type === 'group') {
              return { ...n, dragHandle: '.custom-drag-handle' };
            }
            return n;
          });
          setNodes(patchedNodes);
          setEdges(data.edges);

          let maxSwitchId = 0;
          let maxDeviceIds: Record<string, number> = { pc: 0, server: 0, firewall: 0, router: 0, wifi: 0, printer: 0 };

          patchedNodes.forEach((n: Node) => {
            if (n.type === 'switch') {
              const num = parseInt(n.id.split('-')[1]);
              if (num > maxSwitchId) maxSwitchId = num;
            } else {
              const parts = n.id.split('-');
              const devType = parts[0];
              const num = parseInt(parts[1]);
              if (devType in maxDeviceIds && num > maxDeviceIds[devType]) {
                maxDeviceIds[devType] = num;
              }
            }
          });

          switchCounter.current = maxSwitchId + 1;
          Object.keys(maxDeviceIds).forEach(k => {
            deviceCounters.current[k] = maxDeviceIds[k] + 1;
          });
        }
      })
      .catch(err => console.error("Could not load from server.", err));
  }, []);

  const saveDeviceInfo = useCallback(() => {
    if (!selectedDeviceData) return;
    setNodes(nds => nds.map(n => {
      if (n.id === selectedDeviceData.id) {
        return { ...n, data: { ...n.data, info: tempInfo, ip: tempIp, mac: tempMac, customName: tempCustomName, vms: tempVms } };
      }
      return n;
    }));
    setSelectedDeviceData(prev => prev ? { ...prev, info: tempInfo, ip: tempIp, mac: tempMac, customName: tempCustomName, vms: tempVms } : null);
    setIsEditingInfo(false);
  }, [selectedDeviceData, tempInfo, tempIp, tempMac, tempCustomName, tempVms, setNodes]);

  const deleteSelectedElement = useCallback(() => {
    if (!selectedDeviceData) return;

    if (selectedDeviceData.isEdge) {
      setEdges((eds) => eds.filter(e => e.id !== selectedDeviceData.id));
    } else {
      setNodes((nds) => nds.filter(n => n.id !== selectedDeviceData.id));
      setEdges((eds) => eds.filter(e => e.source !== selectedDeviceData.id && e.target !== selectedDeviceData.id));
    }

    setSelectedDeviceData(null);
    setOpenMenu(null);
  }, [selectedDeviceData, setNodes, setEdges]);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [customPorts, setCustomPorts] = useState(24);
  const [customSfp, setCustomSfp] = useState(4);
  const [customFiber, setCustomFiber] = useState(0);
  const [customPatchPorts, setCustomPatchPorts] = useState(24);
  const [customPatchFiber, setCustomPatchFiber] = useState(0);

  const [devicePortConfigs, setDevicePortConfigs] = useState<Record<string, number>>(
    DEVICES.reduce((acc, dev) => ({ ...acc, [dev.id]: dev.defaultPorts }), {})
  );
  const [deviceSfpConfigs, setDeviceSfpConfigs] = useState<Record<string, number>>(
    DEVICES.reduce((acc, dev) => ({ ...acc, [dev.id]: 0 }), {})
  );
  const [deviceUsbConfigs, setDeviceUsbConfigs] = useState<Record<string, number>>(
    DEVICES.reduce((acc, dev) => ({ ...acc, [dev.id]: 0 }), {})
  );
  const [deviceFiberConfigs, setDeviceFiberConfigs] = useState<Record<string, number>>(
    DEVICES.reduce((acc, dev) => ({ ...acc, [dev.id]: 0 }), {})
  );

  const handleDevicePortChange = (id: string, ports: number) => {
    setDevicePortConfigs(prev => ({ ...prev, [id]: ports }));
  };

  const handleDeviceSfpChange = (id: string, sfp: number) => {
    setDeviceSfpConfigs(prev => ({ ...prev, [id]: sfp }));
  };
  const handleDeviceUsbChange = (id: string, usb: number) => {
    setDeviceUsbConfigs(prev => ({ ...prev, [id]: usb }));
  };
  const handleDeviceFiberChange = (id: string, fiber: number) => {
    setDeviceFiberConfigs(prev => ({ ...prev, [id]: fiber }));
  };
  const [edgesOnTop, setEdgesOnTop] = useState(false);

  const switchCounter = useRef(1);
  const deviceCounters = useRef<Record<string, number>>({ pc: 1, server: 1, firewall: 1, router: 1, wifi: 1, printer: 1 });

  const addNode = (type: 'switch' | 'patchpanel' | 'device' | 'group', deviceId: string = 'pc', ports = 24, sfpPorts = 0, fiberPorts = 0, devPorts = 1, devSfpPorts = 0, devUsbPorts = 0, devFiberPorts = 0) => {
    let id, label;
    if (type === 'group') {
      const currentGroups = nodes.filter(n => n.type === 'group');
      const maxGroupNum = currentGroups.reduce((max, n) => {
        const num = parseInt(n.id.split('-')[1]);
        return (!isNaN(num) && num > max) ? num : max;
      }, 0);
      id = `group-${maxGroupNum + 1}`;
      label = `${getText('add.group')} ${maxGroupNum + 1}`;
    } else if (type === 'switch') {
      const currentSwitches = nodes.filter(n => n.type === 'switch');
      const maxSwitchNum = currentSwitches.reduce((max, n) => {
        const num = parseInt(n.id.split('-')[1]);
        return (!isNaN(num) && num > max) ? num : max;
      }, 0);
      id = `switch-${maxSwitchNum + 1}`;
      label = `Switch ${maxSwitchNum + 1}`;
    } else if (type === 'patchpanel') {
      const currentPanels = nodes.filter(n => n.type === 'patchpanel');
      const maxPanelNum = currentPanels.reduce((max, n) => {
        const num = parseInt(n.id.split('-')[1]);
        return (!isNaN(num) && num > max) ? num : max;
      }, 0);
      id = `patchpanel-${maxPanelNum + 1}`;
      label = `Patch Panel ${maxPanelNum + 1}`;
    } else {
      const currentDevices = nodes.filter(n => n.type !== 'switch' && n.data.deviceType === deviceId);
      const maxDeviceNum = currentDevices.reduce((max, n) => {
        const num = parseInt(n.id.split('-')[1]);
        return (!isNaN(num) && num > max) ? num : max;
      }, 0);
      id = `${deviceId}-${maxDeviceNum + 1}`;
      const devCfg = DEVICES.find((d) => d.id === deviceId);
      label = `${devCfg ? getText(devCfg.nameKey) : 'Device'} ${maxDeviceNum + 1}`;
    }

    const newNode: Node = {
      id,
      type,
      position: { x: Math.random() * 200 + 400, y: Math.random() * 200 + 150 },
      data: {
        label,
        ...(type === 'group' ? {} : type === 'switch' ? { ports, sfpPorts, fiberPorts, highlightedPort: null } : type === 'patchpanel' ? { ports, fiberPorts, highlightedPort: null } : { ports: devPorts, sfpPorts: devSfpPorts, usbPorts: devUsbPorts, fiberPorts: devFiberPorts, isHighlighted: false, deviceType: deviceId, highlightedPort: [] }),
      },
      ...(type === 'group' ? { style: { width: 300, height: 300 }, zIndex: -1, dragHandle: '.custom-drag-handle' } : {})
    };

    setNodes((nds) => [...nds, newNode]);
    setOpenMenu(null);
    setIsSidebarOpen(false);
  };

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      // Check if the source connector is already connected
      const sourceConnected = edges.some(
        (e) => (e.source === connection.source && e.sourceHandle === connection.sourceHandle) ||
          (e.target === connection.source && e.targetHandle === connection.sourceHandle)
      );
      // Check if the target connector is already connected
      const targetConnected = edges.some(
        (e) => (e.target === connection.target && e.targetHandle === connection.targetHandle) ||
          (e.source === connection.target && e.sourceHandle === connection.targetHandle)
      );

      if (sourceConnected || targetConnected) return false;

      const sourceStr = connection.sourceHandle || '';
      const targetStr = connection.targetHandle || '';

      const isSourceUsb = sourceStr.startsWith('U');
      const isTargetUsb = targetStr.startsWith('U');
      if (isSourceUsb || isTargetUsb) return isSourceUsb === isTargetUsb;

      const isSourceOptical = sourceStr.startsWith('S') || sourceStr.startsWith('F');
      const isTargetOptical = targetStr.startsWith('S') || targetStr.startsWith('F');
      if (isSourceOptical || isTargetOptical) return isSourceOptical === isTargetOptical;

      // RJ45 (no letters) matches RJ45
      return true;
    },
    [edges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!isValidConnection(params)) return;
      setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds));
    },
    [setEdges, isValidConnection]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, clickedNode: Node) => {
      const target = _event.target as HTMLElement;
      const portElement = target.closest('[data-port-id]');
      const clickedPortId = portElement ? portElement.getAttribute('data-port-id') : null;

      const connectedEdgesFull = edges.filter((e) => e.source === clickedNode.id || e.target === clickedNode.id);

      const connectedEdges = clickedPortId
        ? connectedEdgesFull.filter(e => (e.source === clickedNode.id && e.sourceHandle === clickedPortId) || (e.target === clickedNode.id && e.targetHandle === clickedPortId))
        : connectedEdgesFull;

      const highlightDevicePorts: string[] = [];
      const switchHighlights: Record<string, string[]> = {};

      connectedEdges.forEach(e => {
        const isSource = e.source === clickedNode.id;
        const otherNodeId = isSource ? e.target : e.source;
        const selfPortStr = isSource ? e.sourceHandle : e.targetHandle;
        const otherPortStr = isSource ? e.targetHandle : e.sourceHandle;

        if (selfPortStr) highlightDevicePorts.push(selfPortStr);

        if (otherPortStr) {
          if (!switchHighlights[otherNodeId]) switchHighlights[otherNodeId] = [];
          switchHighlights[otherNodeId].push(otherPortStr);
        }
      });

      const firstEdge = connectedEdges[0];
      const isSource = firstEdge ? firstEdge.source === clickedNode.id : false;
      const otherNodeId = isSource ? firstEdge.target : firstEdge?.source;
      const selfPortStr = isSource ? firstEdge.sourceHandle : firstEdge?.targetHandle;
      const otherPortStr = isSource ? firstEdge.targetHandle : firstEdge?.sourceHandle;
      const otherNode = otherNodeId ? nodes.find((n) => n.id === otherNodeId) : null;

      let devCfg = DEVICES.find((d) => d.id === clickedNode.data.deviceType);
      if (!devCfg && clickedNode.type === 'switch') devCfg = { id: 'switch', nameKey: 'dev.switch', icon: Server, color: 'text-cyan-400', label: 'Switch', defaultPorts: 24 };
      if (!devCfg && clickedNode.type === 'patchpanel') devCfg = { id: 'patchpanel', nameKey: 'dev.patchpanel', icon: GripHorizontal, color: 'text-stone-400', label: 'Patch Panel', defaultPorts: 24 };
      if (!devCfg) devCfg = DEVICES[0];

      let connectedToStr = '-';
      let portInfoStr = '-';

      if (connectedEdgesFull.length > 0 && !clickedPortId && clickedNode.type === 'switch') {
        connectedToStr = `${getText('connection.multiple')} (${connectedEdgesFull.length})`;
        portInfoStr = '-';
      } else if (connectedEdges.length > 1) {
        connectedToStr = `${getText('connection.multiple')} (${connectedEdges.length})`;
        portInfoStr = clickedPortId ? clickedPortId : getText('connection.multiplePorts');
      } else if (connectedEdges.length === 1 && otherNode) {
        connectedToStr = (otherNode.data.customName as string) || (otherNode.data.label as string);
        if (clickedNode.type === 'switch') {
          portInfoStr = `${selfPortStr} ➔ Port ${otherPortStr || '?'}`;
        } else {
          portInfoStr = clickedPortId ? clickedPortId : (selfPortStr || '?');
        }
      }

      setSelectedDeviceData({
        id: clickedNode.id,
        deviceName: clickedNode.data.label as string,
        connectedTo: connectedToStr,
        port: portInfoStr,
        icon: devCfg.icon,
        info: (clickedNode.data.info as string) || '',
        ip: (clickedNode.data.ip as string) || '',
        mac: (clickedNode.data.mac as string) || '',
        customName: (clickedNode.data.customName as string) || '',
        vms: (clickedNode.data.vms as any[]) || [],
        deviceType: clickedNode.data.deviceType as string,
      });

      setIsEditingInfo(false);
      setTempInfo((clickedNode.data.info as string) || '');
      setTempIp((clickedNode.data.ip as string) || '');
      setTempMac((clickedNode.data.mac as string) || '');
      setTempCustomName((clickedNode.data.customName as string) || '');
      setTempVms((clickedNode.data.vms as any[]) || []);

      setEdges((eds) =>
        eds.map((e) => {
          const isSelectedEdge = connectedEdges.some(ce => ce.id === e.id);
          if (isSelectedEdge) {
            const isTarget = e.target === clickedNode.id;
            return {
              ...e,
              style: { strokeWidth: 4, stroke: '#22d3ee' },
              animated: true,
              className: isTarget ? 'reverse-animation' : '',
            };
          }
          return { ...e, ...defaultEdgeOptions, animated: false, className: '' };
        })
      );

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === clickedNode.id) {
            if (n.type === 'switch' || n.type === 'patchpanel') {
              return { ...n, data: { ...n.data, highlightedPort: highlightDevicePorts.length > 0 ? highlightDevicePorts : null, isHighlighted: true } };
            }
            return { ...n, data: { ...n.data, isHighlighted: true, highlightedPort: highlightDevicePorts } };
          }
          if (switchHighlights[n.id]) {
            if (n.type === 'switch' || n.type === 'patchpanel') {
              return { ...n, data: { ...n.data, highlightedPort: switchHighlights[n.id], isHighlighted: false } };
            }
            return { ...n, data: { ...n.data, isHighlighted: true, highlightedPort: switchHighlights[n.id] } };
          }
          if (n.type === 'switch' || n.type === 'patchpanel') return { ...n, data: { ...n.data, highlightedPort: null, isHighlighted: false } };
          if (n.type === 'device' || n.type === 'pc') return { ...n, data: { ...n.data, isHighlighted: false, highlightedPort: [] } };
          return n;
        })
      );
    },
    [edges, nodes, setEdges, setNodes]
  );

  const onEdgeClick = useCallback((_event: React.MouseEvent, clickedEdge: Edge) => {
    // Reset highlights on nodes
    setNodes((nds) => nds.map((n) => {
      if (n.type === 'switch' || n.type === 'patchpanel') return { ...n, data: { ...n.data, highlightedPort: null, isHighlighted: false } };
      if (n.type === 'device' || n.type === 'pc') return { ...n, data: { ...n.data, isHighlighted: false, highlightedPort: [] } };
      return n;
    }));

    // Highlight just the clicked edge
    setEdges((eds) => eds.map((e) => ({
      ...e,
      ...(e.id === clickedEdge.id ? { style: { strokeWidth: 4, stroke: '#ef4444' }, animated: true, className: '' } : { ...defaultEdgeOptions, animated: false, className: '' })
    })));

    const sourceNode = nodes.find(n => n.id === clickedEdge.source);
    const targetNode = nodes.find(n => n.id === clickedEdge.target);

    setSelectedDeviceData({
      id: clickedEdge.id,
      deviceName: getText('details.cable'),
      connectedTo: targetNode ? ((targetNode.data.customName as string) || (targetNode.data.label as string)) : '-',
      port: clickedEdge.targetHandle || '-',
      icon: Activity,
      info: `${getText('details.cableBetween')}:\n[` + (sourceNode ? ((sourceNode.data.customName as string) || (sourceNode.data.label as string)) : '?') + '] ' + getText('details.and') + ' [' + (targetNode ? ((targetNode.data.customName as string) || (targetNode.data.label as string)) : '?') + ']',
      ip: '',
      mac: '',
      customName: '',
      isEdge: true,
      sourceNodeId: clickedEdge.source,
      targetNodeId: clickedEdge.target,
    });
    setIsEditingInfo(false);
  }, [nodes, setNodes, setEdges]);

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      let nx = node.position.x;
      let ny = node.position.y;
      let currParent = node.parentId;
      while (currParent) {
        const p = nodesRef.current.find((n) => n.id === currParent);
        if (p) {
          nx += p.position.x;
          ny += p.position.y;
          currParent = p.parentId;
        } else break;
      }

      const groupNodes = nodesRef.current.filter((n) => n.type === 'group');

      const intersections = groupNodes.filter((g) => {
        if (g.id === node.id) return false;

        let isAncestor = false;
        let curr = g;
        while (curr && curr.parentId) {
          if (curr.parentId === node.id) { isAncestor = true; break; }
          const p = curr.parentId; // keep TS happy in scope
          curr = nodesRef.current.find(n => n.id === p) as Node;
        }
        if (isAncestor) return false;

        let gx = g.position.x;
        let gy = g.position.y;
        let gParent = g.parentId;
        while (gParent) {
          const p = nodesRef.current.find((n) => n.id === gParent);
          if (p) {
            gx += p.position.x;
            gy += p.position.y;
            gParent = p.parentId;
          } else break;
        }

        const gw = (g.measured?.width) || (g.width) || parseInt(String(g.style?.width || '300')) || 300;
        const gh = (g.measured?.height) || (g.height) || parseInt(String(g.style?.height || '300')) || 300;

        const nodeW = (node.measured?.width) || (node.width) || parseInt(String(node.style?.width || '50')) || 50;
        const nodeH = (node.measured?.height) || (node.height) || parseInt(String(node.style?.height || '50')) || 50;

        // Parent area must be strictly larger than the dragged node to absorb it
        if (gw <= nodeW && gh <= nodeH) return false;

        const nodeCenterY = ny + (nodeH / 2);
        const nodeCenterX = nx + (nodeW / 2);

        return nodeCenterX >= gx && nodeCenterX <= gx + gw && nodeCenterY >= gy && nodeCenterY <= gy + gh;
      });

      intersections.sort((a, b) => {
        const aW = (a.measured?.width) || (a.width) || parseInt(String(a.style?.width || '300')) || 300;
        const aH = (a.measured?.height) || (a.height) || parseInt(String(a.style?.height || '300')) || 300;
        const bW = (b.measured?.width) || (b.width) || parseInt(String(b.style?.width || '300')) || 300;
        const bH = (b.measured?.height) || (b.height) || parseInt(String(b.style?.height || '300')) || 300;
        return (aW * aH) - (bW * bH);
      });

      const intersectedGroup = intersections[0];

      if (intersectedGroup && node.parentId !== intersectedGroup.id) {
        let groupX = intersectedGroup.position.x;
        let groupY = intersectedGroup.position.y;
        let iParent = intersectedGroup.parentId;
        while (iParent) {
          const p = nodesRef.current.find((n) => n.id === iParent);
          if (p) {
            groupX += p.position.x;
            groupY += p.position.y;
            iParent = p.parentId;
          } else break;
        }

        setNodes((nds) => nds.map(n => {
          if (n.id === node.id) {
            return {
              ...n,
              parentId: intersectedGroup.id,
              position: {
                x: nx - groupX,
                y: ny - groupY
              },
              zIndex: n.type === 'group' ? -1 : 0
            };
          }
          return n;
        }));
      } else if (!intersectedGroup && node.parentId) {
        setNodes((nds) => nds.map(n => {
          if (n.id === node.id) {
            return {
              ...n,
              parentId: undefined,
              position: {
                x: nx,
                y: ny
              },
              zIndex: n.type === 'group' ? -1 : 0
            };
          }
          return n;
        }));
      }
    },
    [setNodes]
  );

  const onPaneClick = useCallback(() => {
    setSelectedDeviceData(null);
    setEdges((eds) =>
      eds.map((e) => ({ ...e, ...defaultEdgeOptions, animated: false, className: '' }))
    );
    setNodes((nds) =>
      nds.map((n) => {
        if (n.type === 'switch' || n.type === 'patchpanel') return { ...n, data: { ...n.data, highlightedPort: null, isHighlighted: false } };
        if (n.type === 'device' || n.type === 'pc') return { ...n, data: { ...n.data, isHighlighted: false } };
        return n;
      })
    );
    setOpenMenu(null);
  }, [setEdges, setNodes]);

  const SelectedIcon = selectedDeviceData?.icon || HardDrive;

  // Export function (Save to JSON file)
  const onExport = useCallback(() => {
    const data = {
      nodes,
      edges,
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'network-map.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [nodes, edges]);

  // Import function (Read from JSON file)
  const onImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const data = JSON.parse(json);

        if (data.nodes && data.edges) {
          // Reset selection
          setSelectedDeviceData(null);
          // Set imported data
          setNodes(data.nodes);
          setEdges(data.edges);

          // Update highest IDs to continue work after loading save
          let maxSwitchId = 0;
          let maxDeviceIds: Record<string, number> = { pc: 0, server: 0, firewall: 0, router: 0, wifi: 0, printer: 0 };

          data.nodes.forEach((n: Node) => {
            if (n.type === 'switch') {
              const num = parseInt(n.id.split('-')[1]);
              if (num > maxSwitchId) maxSwitchId = num;
            } else {
              const parts = n.id.split('-');
              const devType = parts[0];
              const num = parseInt(parts[1]);
              if (devType in maxDeviceIds && num > maxDeviceIds[devType]) {
                maxDeviceIds[devType] = num;
              }
            }
          });

          switchCounter.current = maxSwitchId + 1;
          Object.keys(maxDeviceIds).forEach(k => {
            deviceCounters.current[k] = maxDeviceIds[k] + 1;
          });
        } else {
          alert('Invalid format for network map file.');
        }
      } catch (err) {
        alert('Failed to load the file. It is probably corrupted.');
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be loaded again after changes
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [setNodes, setEdges]);

  // Save to server function
  const onSaveToServer = useCallback(async () => {
    const data = {
      nodes,
      edges,
    };
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert('Successfully saved the map to the server!');
      } else {
        alert('Server error while saving visualization.');
      }
    } catch {
      alert('Failed to connect to the server to save the layout!');
    }
  }, [nodes, edges]);

  // Download PNG
  const onDownloadImage = useCallback(() => {
    if (reactFlowWrapper.current === null) return;

    // We need to remove zoom/pan transformations to take a screenshot of the entire panel
    // or take a snapshot of the viewport area. Let's take a viewport snapshot
    const node = reactFlowWrapper.current;

    toPng(node, {
      filter: (node) => {
        // Ignore minimap UI and controls during screenshot
        if (node?.classList?.contains('react-flow__minimap') ||
          node?.classList?.contains('react-flow__controls') ||
          node?.classList?.contains('react-flow__panel')) {
          return false;
        }
        return true;
      },
      backgroundColor: '#0f172a',
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'network-map.png';
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Error generating PNG image:', err);
        alert('Error occurred while generating image snapshot.');
      });
  }, []);

  return (
    <div className="w-screen h-[100dvh] flex relative overflow-hidden bg-slate-900">

      {/* Mobile Menu Button */}
      <button
        className="md:hidden absolute top-4 left-4 z-[60] bg-slate-800 p-2 rounded-md border border-slate-700 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 shadow-xl transition-colors"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Shadow under menu on mobile (covers grid) */}
      {isSidebarOpen && (
        <div
          className="md:hidden absolute inset-0 bg-black/60 z-[40] backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar UI */}
      <div className={`
        fixed md:relative
        top-0 left-0 h-full
        w-[85vw] sm:w-80 bg-slate-900 border-r border-slate-700 p-6 flex flex-col 
        z-[50] shadow-[10px_0_30px_rgba(0,0,0,0.5)] md:shadow-2xl transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between mb-6 mt-12 md:mt-0">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
            <Server className="text-cyan-400" size={28} />
            {getText('app.title')}
          </h1>

          <div className="flex items-center gap-2">
            <div className="relative group/lang">
              <button className="flex items-center justify-center p-1.5 rounded-md border bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
                <Globe size={14} />
              </button>
              <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-xl opacity-0 invisible group-hover/lang:opacity-100 group-hover/lang:visible transition-all z-50 flex flex-col w-20 overflow-hidden">
                <button onClick={() => setLang('pl')} className={`px-3 py-1.5 text-xs text-left hover:bg-slate-700 ${lang === 'pl' ? 'text-cyan-400 font-bold' : 'text-slate-300'}`}>PL</button>
                <button onClick={() => setLang('en')} className={`px-3 py-1.5 text-xs text-left hover:bg-slate-700 ${lang === 'en' ? 'text-cyan-400 font-bold' : 'text-slate-300'}`}>EN</button>
              </div>
            </div>

            <button
              onClick={() => setEdgesOnTop(!edgesOnTop)}
              className={`flex items-center gap-1.5 p-1.5 px-2.5 rounded-md border transition-all ${edgesOnTop
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.1)]'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                }`}
              title={getText('app.layer.title')}
            >
              <Layers size={14} />
              <span className="text-[10px] uppercase font-bold tracking-wider">
                {edgesOnTop ? getText('app.layer.over') : getText('app.layer.under')}
              </span>
            </button>
          </div>
        </div>

        {/* Global Actions: Save / Load / PNG */}
        <div className="mb-6 pb-6 border-b border-slate-800 flex gap-3 w-full">
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={onImport}
            className="hidden"
          />
          <button
            onClick={onSaveToServer}
            className="flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-xl bg-emerald-600/20 border border-emerald-500/50 hover:bg-emerald-600/30 transition-all text-emerald-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] focus:outline-none"
            title={getText('actions.saveDesc')}
          >
            <Cloud size={18} className="mb-1.5" />
            <span className="text-[10px] uppercase font-bold">{getText('actions.save')}</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-cyan-500/50 transition-all text-slate-300 hover:text-cyan-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] focus:outline-none"
            title={getText('actions.importDesc')}
          >
            <UploadCloud size={18} className="mb-1.5" />
            <span className="text-[10px] uppercase font-semibold">{getText('actions.import')}</span>
          </button>

          <button
            onClick={onExport}
            className="flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-cyan-500/50 transition-all text-slate-300 hover:text-cyan-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] focus:outline-none"
            title={getText('actions.exportDesc')}
          >
            <DownloadCloud size={18} className="mb-1.5" />
            <span className="text-[10px] uppercase font-semibold">{getText('actions.export')}</span>
          </button>

          <button
            onClick={onDownloadImage}
            className="flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-emerald-500/50 transition-all text-slate-300 hover:text-emerald-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] focus:outline-none"
            title={getText('actions.screenshotDesc')}
          >
            <Camera size={18} className="mb-1.5" />
            <span className="text-[10px] uppercase font-semibold">{getText('actions.screenshot')}</span>
          </button>
        </div>


        <div className="flex flex-col gap-3 mb-8 flex-1 overflow-y-auto pr-1 stylish-scroll">

          {/* Add Group */}
          <div className="relative border-b border-slate-700/50 pb-3 mb-1 shrink-0">
            <button
              onClick={() => addNode('group')}
              className="w-full flex items-center gap-3 bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-lg border border-slate-600 hover:border-cyan-500 transition-all shadow-sm group"
            >
              <div className="bg-slate-700 p-1.5 rounded-md group-hover:bg-cyan-500/20 transition-colors">
                <SquareDashed size={18} className="text-cyan-400" />
              </div>
              <span className="font-medium flex-1 text-left text-sm">{getText('add.group')}</span>
              <Plus size={16} className="text-slate-400 group-hover:text-cyan-400" />
            </button>
          </div>

          <div className="relative border-b border-slate-700/50 pb-3 mb-1 shrink-0">
            <button
              onClick={() => setOpenMenu(openMenu === 'switch' ? null : 'switch')}
              className={`w-full flex items-center gap-3 bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-lg border transition-all shadow-sm group ${openMenu === 'switch' ? 'border-cyan-500' : 'border-slate-600 hover:border-cyan-500'}`}
            >
              <div className={`p-1.5 rounded-md transition-colors ${openMenu === 'switch' ? 'bg-cyan-500/20' : 'bg-slate-700 group-hover:bg-cyan-500/20'}`}>
                <Server size={18} className="text-cyan-400" />
              </div>
              <span className="font-medium flex-1 text-left text-sm">{getText('add.switch')}</span>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${openMenu === 'switch' ? 'rotate-180 text-cyan-400' : 'group-hover:text-cyan-400'}`} />
            </button>

            {openMenu === 'switch' && (
              <div className="mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden z-20">
                <div className="p-3 bg-slate-800/80">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="flex flex-col flex-1">
                      <label className="text-[10px] text-slate-400 mb-1">{getText('switch.ports')}</label>
                      <input
                        type="number"
                        value={customPorts}
                        onChange={(e) => setCustomPorts(Number(e.target.value))}
                        className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 w-full"
                        min="0"
                        max="96"
                      />
                    </div>
                    <div className="flex flex-col flex-1">
                      <label className="text-[10px] text-slate-400 mb-1">{getText('switch.sfp')}</label>
                      <input
                        type="number"
                        value={customSfp}
                        onChange={(e) => setCustomSfp(Number(e.target.value))}
                        className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 w-full"
                        min="0"
                        max="32"
                      />
                    </div>
                    <div className="flex flex-col flex-1">
                      <label className="text-[10px] text-slate-400 mb-1">FIBER (Flat)</label>
                      <input
                        type="number"
                        value={customFiber}
                        onChange={(e) => setCustomFiber(Number(e.target.value))}
                        className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 w-full"
                        min="0"
                        max="64"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => addNode('switch', '', customPorts, customSfp, customFiber)}
                    className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 hover:border-cyan-500 p-2 rounded-md text-sm transition-all shadow-sm group"
                  >
                    <span className="font-medium">Add Custom</span>
                    <Plus size={14} className="text-slate-400 group-hover:text-cyan-400" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Add Patch Panel */}
          <div className="relative border-b border-slate-700/50 pb-3 mb-1 shrink-0">
            <button
              onClick={() => setOpenMenu(openMenu === 'patchpanel' ? null : 'patchpanel')}
              className={`w-full flex items-center gap-3 bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-lg border transition-all shadow-sm group ${openMenu === 'patchpanel' ? 'border-amber-500' : 'border-slate-600 hover:border-amber-500'}`}
            >
              <div className={`p-1.5 rounded-md transition-colors ${openMenu === 'patchpanel' ? 'bg-amber-500/20' : 'bg-slate-700 group-hover:bg-amber-500/20'}`}>
                <GripHorizontal size={18} className="text-amber-500" />
              </div>
              <span className="font-medium flex-1 text-left text-sm">{getText('add.patchpanel')}</span>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${openMenu === 'patchpanel' ? 'rotate-180 text-amber-500' : 'group-hover:text-amber-500'}`} />
            </button>

            {openMenu === 'patchpanel' && (
              <div className="mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden z-20">
                <div className="p-3 bg-slate-800/80">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex flex-col flex-1">
                      <label className="text-[10px] text-slate-400 mb-1">{getText('switch.ports')}</label>
                      <input
                        type="number"
                        value={customPatchPorts}
                        onChange={(e) => setCustomPatchPorts(Number(e.target.value))}
                        className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-amber-500 w-full"
                        min="0"
                        max="96"
                      />
                    </div>
                    <div className="flex flex-col flex-1">
                      <label className="text-[10px] text-slate-400 mb-1">FIBER (Optical Fiber)</label>
                      <input
                        type="number"
                        value={customPatchFiber}
                        onChange={(e) => setCustomPatchFiber(Number(e.target.value))}
                        className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-amber-500 w-full"
                        min="0"
                        max="96"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => addNode('patchpanel', '', customPatchPorts, 0, customPatchFiber)}
                    className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 hover:border-amber-500 p-2 rounded-md text-sm transition-all shadow-sm group"
                  >
                    <span className="font-medium">Add Custom</span>
                    <Plus size={14} className="text-slate-400 group-hover:text-amber-500" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {DEVICES.map((dev) => {
            const DeviceIcon = dev.icon;
            const isOpen = openMenu === dev.id;
            return (
              <div key={dev.id} className="relative shrink-0">
                <button
                  onClick={() => setOpenMenu(isOpen ? null : dev.id)}
                  className={`w-full flex items-center gap-3 bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-lg border transition-all shadow-sm group ${isOpen ? 'border-cyan-500' : 'border-slate-600 hover:border-cyan-500'}`}
                >
                  <div className={`p-1.5 rounded-md transition-colors ${isOpen ? 'bg-cyan-500/20' : 'bg-slate-700 group-hover:bg-cyan-500/20'}`}>
                    <DeviceIcon size={18} className={dev.color} />
                  </div>
                  <span className="font-medium flex-1 text-left text-sm">{getText(dev.nameKey)}</span>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-cyan-400' : 'group-hover:text-cyan-400'}`} />
                </button>

                {isOpen && (
                  <div className="mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden z-20">
                    <div className="p-3 bg-slate-800/80">
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <div className="flex flex-col flex-1">
                          <label className="text-[10px] text-slate-400 mb-1 font-semibold uppercase">{getText('switch.ports')}</label>
                          <input
                            type="number"
                            value={devicePortConfigs[dev.id] !== undefined ? devicePortConfigs[dev.id] : dev.defaultPorts}
                            onChange={(e) => handleDevicePortChange(dev.id, Number(e.target.value))}
                            className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 w-full"
                            min="0"
                            max="16"
                          />
                        </div>
                        <div className="flex flex-col flex-1">
                          <label className="text-[10px] text-slate-400 mb-1 font-semibold uppercase">{getText('switch.sfp')}</label>
                          <input
                            type="number"
                            value={deviceSfpConfigs[dev.id] !== undefined ? deviceSfpConfigs[dev.id] : 0}
                            onChange={(e) => handleDeviceSfpChange(dev.id, Number(e.target.value))}
                            className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 w-full"
                            min="0"
                            max="8"
                          />
                        </div>
                        <div className="flex flex-col flex-1">
                          <label className="text-[10px] text-slate-400 mb-1 font-semibold uppercase">FIBER</label>
                          <input
                            type="number"
                            value={deviceFiberConfigs[dev.id] !== undefined ? deviceFiberConfigs[dev.id] : 0}
                            onChange={(e) => handleDeviceFiberChange(dev.id, Number(e.target.value))}
                            className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 w-full"
                            min="0"
                            max="8"
                          />
                        </div>
                        <div className="flex flex-col flex-1">
                          <label className="text-[10px] text-slate-400 mb-1 font-semibold uppercase">USB</label>
                          <input
                            type="number"
                            value={deviceUsbConfigs[dev.id] !== undefined ? deviceUsbConfigs[dev.id] : 0}
                            onChange={(e) => handleDeviceUsbChange(dev.id, Number(e.target.value))}
                            className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 w-full"
                            min="0"
                            max="8"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const portsToOpen = devicePortConfigs[dev.id] !== undefined ? devicePortConfigs[dev.id] : dev.defaultPorts;
                          const sfpToOpen = deviceSfpConfigs[dev.id] !== undefined ? deviceSfpConfigs[dev.id] : 0;
                          const usbToOpen = deviceUsbConfigs[dev.id] !== undefined ? deviceUsbConfigs[dev.id] : 0;
                          const fiberToOpen = deviceFiberConfigs[dev.id] !== undefined ? deviceFiberConfigs[dev.id] : 0;
                          addNode('device', dev.id, 0, 0, 0, portsToOpen, sfpToOpen, usbToOpen, fiberToOpen);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 hover:border-cyan-500 p-2 rounded-md text-sm transition-all shadow-sm group"
                      >
                        <span className="font-medium">Add {getText(dev.nameKey)}</span>
                        <Plus size={14} className="text-slate-400 group-hover:text-cyan-400" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Information Panel */}
        <div className="p-5 overflow-y-auto max-h-[calc(100vh-60px)]">
          <div className="flex items-center justify-between mb-3 text-slate-500">
            <h2 className="text-xs uppercase tracking-wider font-semibold flex items-center gap-2">
              <Info size={14} /> {getText('details.title')}
            </h2>
            {selectedDeviceData && (
              <div className="flex gap-1">
                {!selectedDeviceData.isEdge && (
                  <button
                    onClick={() => isEditingInfo ? saveDeviceInfo() : setIsEditingInfo(true)}
                    className={`p-1 rounded transition-colors ${isEditingInfo ? 'text-emerald-400 hover:bg-emerald-400/10' : 'hover:text-cyan-400 hover:bg-cyan-400/10'}`}
                    title={isEditingInfo ? getText('details.save') : getText('details.edit')}
                  >
                    {isEditingInfo ? <Save size={16} /> : <Settings size={16} />}
                  </button>
                )}
                <button
                  onClick={deleteSelectedElement}
                  className="p-1 rounded transition-colors text-red-400 hover:bg-red-400/10 hover:text-red-300"
                  title={getText('details.deleteDesc')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 min-h-[120px] shadow-inner">
            {selectedDeviceData ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 border-b border-slate-700 pb-2">
                  <SelectedIcon size={16} className="text-cyan-400" />
                  <span className="font-medium text-slate-200">{selectedDeviceData.customName || selectedDeviceData.deviceName}</span>
                  {selectedDeviceData.customName && <span className="text-[10px] text-slate-500 ml-1">({selectedDeviceData.deviceName})</span>}
                </div>
                {!isEditingInfo ? (
                  <>
                    {selectedDeviceData.connectedTo !== '-' && (
                      <div className="text-sm text-slate-400 leading-relaxed">
                        {getText('details.connectedTo')}: <span className="text-cyan-300 font-medium">{selectedDeviceData.connectedTo}</span> {getText('details.port')} <span className="text-cyan-300 font-mono bg-cyan-900/40 px-1.5 py-0.5 rounded">{selectedDeviceData.port}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {selectedDeviceData.ip && (
                        <div className="bg-slate-900/50 p-2 rounded border border-slate-700/50">
                          <span className="text-[9px] text-slate-500 uppercase font-semibold block mb-0.5">{getText('details.ip')}</span>
                          <span className="text-xs text-emerald-300 font-mono">{selectedDeviceData.ip}</span>
                        </div>
                      )}
                      {selectedDeviceData.mac && (
                        <div className="bg-slate-900/50 p-2 rounded border border-slate-700/50">
                          <span className="text-[9px] text-slate-500 uppercase font-semibold block mb-0.5">{getText('details.mac')}</span>
                          <span className="text-xs text-cyan-300 font-mono uppercase">{selectedDeviceData.mac}</span>
                        </div>
                      )}
                    </div>

                    {selectedDeviceData.info && (
                      <div className="bg-slate-900/50 p-2 rounded border border-slate-700/50">
                        <span className="text-[9px] text-slate-500 uppercase font-semibold block mb-1">{getText('details.info')}</span>
                        <div className="text-xs text-slate-300 whitespace-pre-wrap break-words">
                          {selectedDeviceData.info}
                        </div>
                      </div>
                    )}

                    {selectedDeviceData.deviceType === 'server' && selectedDeviceData.vms && selectedDeviceData.vms.length > 0 && (
                      <div className="bg-slate-900/50 p-2 rounded border border-slate-700/50 mt-1 col-span-2">
                        <span className="text-[9px] text-slate-500 uppercase font-semibold block mb-1">Maszyny Wirtualne (VMs)</span>
                        <div className="flex flex-col gap-1.5">
                          {selectedDeviceData.vms.map(vm => (
                            <div key={vm.id} className="flex items-center justify-between text-xs bg-slate-800 p-1.5 px-2.5 rounded border border-slate-600 shadow-sm">
                              <span className="text-slate-300 font-medium truncate max-w-[50%]">{vm.name || 'Nienazwana VM'}</span>
                              {vm.ip && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <div className={`w-1.5 h-1.5 rounded-full ${vm.isOnline ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]' : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]'}`} />
                                  <span className="font-mono text-cyan-400/80">{vm.ip}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!selectedDeviceData.info && !selectedDeviceData.ip && !selectedDeviceData.mac && selectedDeviceData.connectedTo === '-' && (!selectedDeviceData.vms || selectedDeviceData.vms.length === 0) && (
                      <div className="text-xs text-slate-500 italic mt-1">No additional information. Click the options icon to add.</div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">{getText('details.customName')}</label>
                      <input
                        value={tempCustomName}
                        onChange={(e) => setTempCustomName(e.target.value)}
                        placeholder="e.g. Main Router, Boss's Computer..."
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-400 uppercase font-semibold">{getText('details.ip')}</label>
                        <input
                          value={tempIp}
                          onChange={(e) => setTempIp(e.target.value)}
                          placeholder="192.168.1.1"
                          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-400 uppercase font-semibold">{getText('details.mac')}</label>
                        <input
                          value={tempMac}
                          onChange={(e) => setTempMac(e.target.value)}
                          placeholder="00:1A:2B:3C:4D:5E"
                          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Optional Description / Note</label>
                      <textarea
                        value={tempInfo}
                        onChange={(e) => setTempInfo(e.target.value)}
                        placeholder="Device details..."
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 min-h-[60px] resize-none"
                      />
                    </div>

                    {(selectedDeviceData.deviceType === 'server' || selectedDeviceData.deviceType === 'nas') && (
                      <div className="flex flex-col gap-1 mt-2 border-t border-slate-700 pt-3">
                        <label className="text-[10px] text-slate-400 uppercase font-semibold">Maszyny Wirtualne (VMs)</label>
                        <div className="flex flex-col gap-2">
                          {tempVms.map((vm, index) => (
                            <div key={vm.id} className="flex gap-2">
                              <input
                                value={vm.name}
                                onChange={(e) => {
                                  const newVms = [...tempVms];
                                  newVms[index].name = e.target.value;
                                  setTempVms(newVms);
                                }}
                                placeholder="Nazwa VM"
                                className="w-[45%] bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                              />
                              <input
                                value={vm.ip}
                                onChange={(e) => {
                                  const newVms = [...tempVms];
                                  newVms[index].ip = e.target.value;
                                  setTempVms(newVms);
                                }}
                                placeholder="IP"
                                className="w-[40%] bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                              />
                              <button onClick={() => setTempVms(tempVms.filter(v => v.id !== vm.id))} className="w-[15%] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded flex items-center justify-center transition-colors">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          <button onClick={() => setTempVms([...tempVms, { id: Date.now().toString(), name: '', ip: '' }])} className="w-full text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 p-1.5 rounded flex items-center justify-center gap-1 mt-1 transition-colors">
                            <Plus size={14} /> Add VM
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 opacity-50">
                <HardDrive size={24} />
                <span className="text-sm text-center">{getText('details.empty')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className={`flex-1 h-full relative ${edgesOnTop ? 'edges-on-top' : ''}`} style={{ backgroundColor: '#0f172a' }} ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={onNodeClick}
          onNodeDragStop={onNodeDragStop}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          fitView
          colorMode="dark"
          defaultEdgeOptions={defaultEdgeOptions}
          connectionMode={ConnectionMode.Loose}
        >
          <Background color="#1e293b" variant={BackgroundVariant.Lines} gap={24} lineWidth={1} />
          <Controls className="bg-slate-800 border-slate-700 fill-slate-300 md:mb-0 mb-6" />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'switch') return '#22d3ee';
              return '#60a5fa';
            }}
            maskColor="rgba(15, 23, 42, 0.7)"
            className="bg-slate-800 border-slate-700 md:mb-0 mb-6"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

