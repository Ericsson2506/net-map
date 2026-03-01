import { memo } from 'react';
import { Handle, Position, useNodeId, useNodeConnections } from '@xyflow/react';
import { Monitor, Shield, Printer, Router, Wifi, Database, HardDrive } from 'lucide-react';

const iconMap: Record<string, any> = {
    pc: Monitor,
    server: Database,
    firewall: Shield,
    printer: Printer,
    router: Router,
    wifi: Wifi,
    nas: HardDrive,
};

export default memo(function DeviceNode({ data }: any) {
    const isHighlighted = data.isHighlighted;
    const deviceType = data.deviceType || 'pc';
    const IconComponent = iconMap[deviceType] || Monitor;
    const portCount = data.ports ?? 1;
    const sfpCount = data.sfpPorts ?? 0;
    const usbCount = data.usbPorts ?? 0;
    const fiberCount = data.fiberPorts ?? 0;
    const totalPorts = portCount + sfpCount + usbCount + fiberCount;
    const rj45Ports = Array.from({ length: portCount }, (_, i) => i + 1);
    const sfpPorts = Array.from({ length: sfpCount }, (_, i) => portCount + i + 1);
    const usbPorts = Array.from({ length: usbCount }, (_, i) => portCount + sfpCount + i + 1);
    const fiberPorts = Array.from({ length: fiberCount }, (_, i) => portCount + sfpCount + usbCount + i + 1);

    const nodeId = useNodeId() || '';
    const connections = useNodeConnections({ id: nodeId });
    const connectedPorts = new Set<string>();

    connections.forEach(c => {
        if (c.source === nodeId && c.sourceHandle) connectedPorts.add(c.sourceHandle);
        if (c.target === nodeId && c.targetHandle) connectedPorts.add(c.targetHandle);
    });

    return (
        <div className={`bg-slate-700 border-[1px] ${isHighlighted ? 'border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'border-slate-500'} rounded p-2 flex flex-col items-center gap-1 hover:border-cyan-400 transition-colors cursor-pointer min-w-[80px]`}>

            <IconComponent size={32} className={`mt-2 ${isHighlighted ? 'text-cyan-300' : 'text-slate-200'} relative`} />

            <div className={`mt-1 flex flex-col items-center justify-center w-full px-1 text-center ${isHighlighted ? 'text-cyan-300' : 'text-slate-300'}`}>
                <span className="text-xs truncate font-medium max-w-full">
                    {data.customName || data.label}
                </span>
                {data.ip && (
                    <div className="flex items-center gap-1 justify-center mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${data.isOnline ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]' : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]'}`} />
                        <span className="text-[9px] font-mono text-slate-400 truncate max-w-full">
                            {data.ip}
                        </span>
                    </div>
                )}
                {data.vms && data.vms.length > 0 && (
                    <div className="mt-1.5 flex flex-col items-center w-full gap-0.5 border-t border-slate-500/30 pt-1.5">
                        <span className="text-[8px] uppercase font-bold text-slate-500 mb-0.5">VMs</span>
                        {data.vms.map((vm: any) => (
                            <div key={vm.id} className="flex flex-col items-center justify-center w-full bg-slate-800/50 rounded p-1">
                                <span className="text-[9px] text-slate-300 truncate max-w-full font-medium">{vm.name || 'VM'}</span>
                                {vm.ip && (
                                    <div className="flex items-center gap-1 justify-center mt-0.5">
                                        <div className={`w-1 h-1 rounded-full ${vm.isOnline ? 'bg-emerald-400 shadow-[0_0_3px_rgba(52,211,153,0.8)]' : 'bg-red-500 shadow-[0_0_3px_rgba(239,68,68,0.8)]'}`} />
                                        <span className="text-[8px] font-mono text-cyan-400/80 truncate max-w-full">{vm.ip}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {(() => {
                const renderPort = (portNum: number, portType: 'rj45' | 'sfp' | 'usb' | 'fiber') => {
                    const isSfp = portType === 'sfp';
                    const isUsb = portType === 'usb';
                    const isFiber = portType === 'fiber';

                    let portStr = portNum.toString();
                    if (isUsb) portStr = `U${portNum - portCount - sfpCount}`;
                    if (isFiber) portStr = `F${portNum - portCount - sfpCount - usbCount}`;
                    if (isSfp) portStr = `S${portNum - portCount}`; // keeping S1, S2 logic from before but not in the ID yet? Wait, previously portStr for SFP was just a number.
                    // Let's fix SFP ID bug in the previous code? The previous code had `const portStr = isUsb ? \`U\${portNum - portCount - sfpCount}\` : portNum.toString();`
                    // Which meant SFP ports had IDs like "9", "10". Wait! In App.tsx validation, `startsWith('S')` wouldn't match then!
                    // Let me fix that.
                    if (isSfp) portStr = `S${portNum - portCount}`;
                    if (portType === 'rj45') portStr = portNum.toString();

                    const isPortHighlighted = Array.isArray(data.highlightedPort) ? data.highlightedPort.includes(portStr) : data.highlightedPort === portStr;
                    const isConnected = connectedPorts.has(portStr);

                    return (
                        <div key={portStr} data-port-id={portStr} className="flex flex-col items-center relative group cursor-pointer mt-1">
                            <div
                                className={`relative border ${isSfp ? 'w-5 h-5 rounded-md' : isUsb ? 'w-5 h-2.5 rounded-sm' : isFiber ? 'w-4 h-4 rounded-full' : 'w-4 h-4 rounded-sm'} ${isPortHighlighted
                                    ? 'bg-cyan-400 border-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.9)]'
                                    : isConnected
                                        ? 'bg-emerald-500/20 border-emerald-400'
                                        : isUsb
                                            ? 'bg-slate-900 border-zinc-400 group-hover:border-emerald-400 transition-colors shadow-[inset_0_0_2px_rgba(255,255,255,0.2)]'
                                            : isFiber
                                                ? 'bg-slate-900 border-fuchsia-500 group-hover:border-emerald-400 transition-colors'
                                                : isSfp
                                                    ? 'bg-slate-900 border-indigo-400 group-hover:border-emerald-400 transition-colors'
                                                    : 'bg-slate-900 border-slate-500 group-hover:border-emerald-400 transition-colors'
                                    }`}
                            >
                                <Handle
                                    type="source"
                                    id={portStr}
                                    position={Position.Bottom}
                                    style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '2px', height: '2px', borderRadius: 0, border: 'none', background: 'transparent' }}
                                    className="!opacity-0 !absolute !m-0 z-10 cursor-crosshair before:absolute before:-inset-4 before:content-['']"
                                />
                            </div>
                            {totalPorts > 1 && (
                                <span className={`text-[9px] font-mono mt-[1px] ${isUsb ? 'text-zinc-500' : isFiber ? 'text-fuchsia-400/80' : 'text-slate-400'}`}>
                                    {isSfp ? `S${portNum - portCount}` : isUsb ? `U${portNum - portCount - sfpCount}` : isFiber ? `F${portNum - portCount - sfpCount - usbCount}` : portNum}
                                </span>
                            )}
                        </div>
                    );
                };

                return (
                    <div
                        className={`grid gap-1 justify-items-center mt-1 w-full max-w-[120px]`}
                        style={{
                            gridTemplateColumns: `repeat(${Math.min(totalPorts, 4)}, minmax(0, 1fr))`
                        }}
                    >
                        {rj45Ports.map((portNum) => renderPort(portNum, 'rj45'))}
                        {sfpPorts.map((portNum) => renderPort(portNum, 'sfp'))}
                        {fiberPorts.map((portNum) => renderPort(portNum, 'fiber'))}
                        {usbPorts.map((portNum) => renderPort(portNum, 'usb'))}
                    </div>
                );
            })()}
        </div>
    );
});
