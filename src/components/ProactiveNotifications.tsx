import { useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { toast } from 'sonner';

/**
 * Bridge between backend socket events and frontend toast notifications.
 * Mounts once at the app root. No visual rendering.
 */
export function ProactiveNotifications() {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleProactive = (data: { taskId: string; message: string; timestamp: string }) => {
      switch (data.taskId) {
        case 'reminder_check':
          toast.info(data.message, { duration: 8000, id: `proactive-${data.timestamp}` });
          break;
        case 'memory_decay':
          toast.warning(data.message, { duration: 6000, id: `proactive-${data.timestamp}` });
          break;
        case 'daily_summary':
          toast.success(data.message, { duration: 12000, id: `proactive-${data.timestamp}` });
          break;
        case 'evening_wrapup':
          toast(data.message, { duration: 10000, id: `proactive-${data.timestamp}`, style: { background: '#1e1b4b', color: '#e0e7ff' } });
          break;
        case 'behavioral_analysis':
          toast.success(data.message, { duration: 8000, id: `proactive-${data.timestamp}` });
          break;
        default:
          toast(data.message, { duration: 5000, id: `proactive-${data.timestamp}` });
      }
    };

    const handleToolCall = (data: { name: string; arguments: Record<string, any>; result?: string; error?: string }) => {
      if (data.error) {
        toast.error(`Tool "${data.name}" failed: ${data.error}`, { duration: 4000 });
      } else if (data.result) {
        const preview = data.result.length > 80 ? data.result.slice(0, 80) + '...' : data.result;
        toast.success(`Tool: ${data.name} — ${preview}`, { duration: 3000 });
      } else {
        toast(`Running tool: ${data.name}...`, { duration: 2000 });
      }
    };

    socket.on('agent:proactive', handleProactive);
    socket.on('agent:tool_call', handleToolCall);

    return () => {
      socket.off('agent:proactive', handleProactive);
      socket.off('agent:tool_call', handleToolCall);
    };
  }, [socket]);

  return null;
}
