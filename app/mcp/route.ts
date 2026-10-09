import { runNightlyMemories } from "@/lib/nightly-memories";

type RpcRequest = {
  id?: string | number | null;
  method?: string;
  params?: { name?: string; arguments?: Record<string, unknown> };
};

export async function POST(request: Request) {
  const body = (await request.json()) as RpcRequest;
  if (body.id == null && body.method?.startsWith("notifications/")) {
    return new Response(null, { status: 202 });
  }
  if (body.method === "initialize") {
    return rpc(body.id, {
      protocolVersion: "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: "kinwhim", version: "1.0.0" },
    });
  }
  if (body.method === "ping") return rpc(body.id, {});
  if (body.method === "tools/list") {
    return rpc(body.id, {
      tools: [
        {
          name: "run_nightly_memories",
          title: "Run Kinwhim nightly memories",
          description:
            "Create due private friendship memories for circles whose reveal time has passed and whose members have all checked in.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
      ],
    });
  }
  if (body.method === "tools/call" && body.params?.name === "run_nightly_memories") {
    try {
      const result = await runNightlyMemories();
      return rpc(body.id, {
        content: [{ type: "text", text: result.summary }],
        structuredContent: result,
      });
    } catch (error) {
      return rpc(body.id, {
        content: [{ type: "text", text: error instanceof Error ? error.message : "Nightly processing failed." }],
        isError: true,
      });
    }
  }
  return Response.json(
    { jsonrpc: "2.0", id: body.id ?? null, error: { code: -32601, message: "Method not found" } },
    { status: 404 },
  );
}

function rpc(id: RpcRequest["id"], result: unknown) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, result });
}
