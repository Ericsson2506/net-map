import { memo } from 'react';
import { Handle, Position, useNodeId, useNodeConnections } from '@xyflow/react';
import { GripHorizontal } from 'lucide-react';

export default memo(function PatchPanelNode({ data }: any) {
    const rj45Count = data.ports ?? 24;
    const fiberCount = data.fiberPorts ?? 0;

    const nodeId = useNodeId() || '';
    const connections = useNodeConnections({ id: nodeId });
    const connectedPorts = new Set<string>();

    connections.forEach(c => {
        if (c.source === nodeId && c.sourceHandle) connectedPorts.add(c.sourceHandle);
        if (c.target === nodeId && c.targetHandle) connectedPorts.add(c.targetHandle);
    });

    const rj45Ports = Array.from({ length: rj45Count }, (_, i) => i + 1);
    const fiberPorts = Array.from({ length: fiberCount }, (_, i) => rj45Count + i + 1);

    const renderPort = (portNum: number, portType: 'rj45' | 'fiber') => {
        const isFiber = portType === 'fiber';
        const portStr = isFiber ? `F${portNum - rj45Count}` : portNum.toString();
        const isHighlighted = Array.isArray(data.highlightedPort)
            ? data.highlightedPort.includes(portStr)
            : data.highlightedPort === portStr;

        const isConnected = connectedPorts.has(portStr);

        return (
            <div key={portStr} data-port-id={portStr} className="flex flex-col items-center relative group/port">
                <div className={`relative ${isFiber ? 'w-4 h-4' : 'w-4 h-4'} group mt-1`}>
                    <div
                        className={`absolute inset-0 border ${isFiber ? 'rounded-full' : 'rounded-sm'} ${isHighlighted
                            ? 'bg-cyan-400 border-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.9)]'
                            : isConnected
                                ? 'bg-emerald-500/20 border-emerald-400'
                                : isFiber
                                    ? 'bg-slate-900 border-fuchsia-500 group-hover:border-emerald-400 transition-colors'
                                    : 'bg-slate-900 border-slate-500 group-hover:border-emerald-400 transition-colors'
                            }`}
                    />
                    <Handle
                        type="source"
                        id={portStr}
                        position={portNum % 2 !== 0 ? Position.Top : Position.Bottom}
                        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '2px', height: '2px', borderRadius: 0, border: 'none', background: 'transparent' }}
                        className="!opacity-0 !absolute !m-0 z-10 cursor-crosshair before:absolute before:-inset-4 before:content-['']"
                    />
                </div>
                <span className={`text-[9px] font-mono mt-1 w-full text-center ${isFiber ? 'text-fuchsia-400/80' : 'text-slate-400'}`}>
                    {isFiber ? `F${portNum - rj45Count}` : portNum}
                </span>
            </div>
        );
    };

    const isHighlighted = data.isHighlighted;

    return (
        <div className={`bg-slate-700/80 border-[1px] border-b-4 ${isHighlighted ? 'border-cyan-400 border-b-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'border-slate-600 border-b-slate-900'} rounded-lg p-3 shadow-xl hover:border-cyan-400 transition-colors cursor-pointer min-w-[120px]`}>
            <div className={`flex items-center gap-2 mb-3 border-b ${isHighlighted ? 'border-cyan-500/50' : 'border-slate-600/50'} pb-2`}>
                <GripHorizontal size={18} className={isHighlighted ? "text-cyan-300" : "text-stone-400"} />
                <div className={`flex flex-col ${isHighlighted ? 'text-cyan-300' : 'text-slate-200'}`}>
                    <span className="font-semibold text-sm whitespace-nowrap">{data.customName || data.label}</span>
                </div>
            </div>

            <div className="flex items-center" style={{ gap: '1.5rem' }}>
                {rj45Count > 0 && (
                    <div className="grid grid-rows-2 grid-flow-col gap-x-2 gap-y-3 justify-items-center">
                        {rj45Ports.map((p) => renderPort(p, 'rj45'))}
                    </div>
                )}

                {fiberCount > 0 && (
                    <>
                        {rj45Count > 0 && <div className="w-px h-12 bg-slate-600/60 rounded-full mx-1"></div>}
                        <div className="grid grid-rows-2 grid-flow-col gap-x-2 gap-y-3 justify-items-center">
                            {fiberPorts.map((p) => renderPort(p, 'fiber'))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});
