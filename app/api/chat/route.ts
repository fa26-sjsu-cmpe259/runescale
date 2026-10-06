import { createAgentUIStreamResponse, type UIMessage } from 'ai';
import { z } from 'zod';
import { createAgent } from '@/lib/agent/configs';
import { isConfigId } from '@/lib/agent/config-info';

const boardSchema = z.object({
  partyLevels: z.array(z.number().int().min(1).max(20)).min(1).max(8),
  monsters: z.array(z.object({ name: z.string().max(80), cr: z.string().max(4), count: z.number().int().min(1).max(50) })).max(30),
});

export async function POST(req: Request): Promise<Response> {
  const { messages, config, board }: { messages: UIMessage[]; config: unknown; board?: unknown } = await req.json();
  if (!isConfigId(config)) {
    return Response.json({ error: `Unknown config: ${String(config)}` }, { status: 400 });
  }
  const parsedBoard = board === undefined ? undefined : boardSchema.safeParse(board);
  if (parsedBoard && !parsedBoard.success) {
    return Response.json({ error: 'Invalid board' }, { status: 400 });
  }
  return createAgentUIStreamResponse({ agent: createAgent(config, parsedBoard?.data), uiMessages: messages });
}
