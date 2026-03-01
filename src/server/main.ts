import { HttpRouter } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { RpcSerialization, RpcServer } from "@effect/rpc"
import { TodoRpcs } from "@shared/rpc/TodoRpcs.js"
import type { TodoId } from "@shared/types/TodoId.js"
import { Effect, Layer } from "effect"
import { createServer } from "node:http"
import { TodoService } from "./services/todo-service/TodoService.js"

// Create Todo handlers layer
const TodoHandlersLive = TodoRpcs.toLayer(
	Effect.gen(function* () {
		const service = yield* TodoService
		return TodoRpcs.of({
			getTodos: () => service.getTodos(),
			addTodo: (payload: string) => service.addTodo(payload),
			toggleTodo: (payload: TodoId) => service.toggleTodo(payload),
			deleteTodo: (payload: TodoId) => service.deleteTodo(payload),
		})
	}),
).pipe(Layer.provide([TodoService.Default]))

const RpcProtocol = RpcServer.layerProtocolWebsocket({ path: "/rpc" }).pipe(Layer.provide(RpcSerialization.layerJson))

// Create RPC server layer
const RpcLive = RpcServer.layer(TodoRpcs).pipe(Layer.provide([TodoHandlersLive, RpcProtocol]))

// Create HTTP server with WebSocket protocol
const HttpServerLive = HttpRouter.Default.serve().pipe(
	Layer.provide([RpcLive, NodeHttpServer.layer(createServer, { port: 3000 })]),
)

NodeRuntime.runMain(Layer.launch(HttpServerLive))
