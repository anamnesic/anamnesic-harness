import Foundation

extension NodeAppModel {
    func gatewayRequest(method: String, params: String = "{}") async throws -> Data {
        try await self.operatorSession.request(method: method, paramsJSON: params, timeoutSeconds: 15)
    }
}
