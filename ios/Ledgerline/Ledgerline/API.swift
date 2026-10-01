import Foundation

struct SessionUser: Decodable, Equatable {
    let id: String
    let email: String
    let displayName: String?
    let dailySpendLimit: Double?
}

struct DaySpend: Decodable, Identifiable {
    var id: String { date }
    let date: String
    let amount: Double
}

struct LedgerTransaction: Decodable, Identifiable {
    let id: String
    let date: String
    let description: String
    let merchant: String?
    let payee: String?
    let amount: Double
    let type: String
    let categoryLabel: String?

    var title: String {
        let named = merchant?.trimmingCharacters(in: .whitespacesAndNewlines)
        if let named, !named.isEmpty { return named }
        let person = payee?.trimmingCharacters(in: .whitespacesAndNewlines)
        if let person, !person.isEmpty { return person }
        return description
    }
}

struct MonthDashboard: Decodable {
    struct Summary: Decodable {
        let totalSpent: Double
        let totalReceived: Double
        let transactionCount: Int
        let avgDailySpend: Double
    }

    let summary: Summary
    let daily: [DaySpend]
    let transactions: [LedgerTransaction]
}

struct GmailStatus: Decodable {
    let connected: Bool
    let email: String?
}

struct BankPreset: Decodable, Identifiable, Hashable {
    let id: String
    let label: String
}

enum APIError: LocalizedError {
    case message(String)
    var errorDescription: String? {
        switch self {
        case .message(let text): return text
        }
    }
}

struct LedgerlineAPI {
    let baseURL: URL
    var token: String?

    static var sharedBase: URL {
        let raw = Bundle.main.object(forInfoDictionaryKey: "LedgerlineAPIBase") as? String
        return URL(string: raw ?? "http://127.0.0.1:4000") ?? URL(string: "http://127.0.0.1:4000")!
    }

    func signInWithApple(identityToken: String, displayName: String?) async throws -> (token: String, user: SessionUser) {
        struct Body: Encodable {
            let identityToken: String
            let displayName: String?
        }
        struct Response: Decodable {
            let token: String
            let user: SessionUser
        }
        let response: Response = try await send(
            "/api/auth/apple",
            method: "POST",
            body: Body(identityToken: identityToken, displayName: displayName),
            authorized: false
        )
        return (response.token, response.user)
    }

    func me() async throws -> SessionUser {
        try await send("/api/auth/me", authorized: true)
    }

    func deleteAccount() async throws {
        try await sendVoid("/api/auth/me", method: "DELETE")
    }

    func dashboard(from: String, to: String) async throws -> MonthDashboard {
        try await send("/api/imports/dashboard?from=\(from)&to=\(to)", authorized: true)
    }

    func gmailStatus() async throws -> GmailStatus {
        try await send("/api/gmail/status", authorized: true)
    }

    func bankPresets() async throws -> [BankPreset] {
        struct Response: Decodable { let presets: [BankPreset] }
        let response: Response = try await send("/api/accounts/bank-presets", authorized: true)
        return response.presets
    }

    func saveBank(_ bankId: String) async throws {
        struct Body: Encodable {
            let bank: String
            let createIfMissing: Bool
        }
        try await sendVoid(
            "/api/accounts",
            method: "PATCH",
            body: Body(bank: bankId, createIfMissing: true)
        )
    }

    func gmailConnectURL() async throws -> URL {
        struct Response: Decodable { let url: String }
        let response: Response = try await send("/api/gmail/connect?return=app", authorized: true)
        guard let url = URL(string: response.url) else {
            throw APIError.message("Gmail connect link was not valid")
        }
        return url
    }

    func enableMailSync() async throws {
        try await sendVoid("/api/gmail/pooling/enable", method: "POST", body: EmptyBody())
    }

    private struct EmptyBody: Encodable {}

    private func send<T: Decodable>(
        _ path: String,
        method: String = "GET",
        body: (any Encodable)? = nil,
        authorized: Bool
    ) async throws -> T {
        let data = try await request(path, method: method, body: body, authorized: authorized)
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw APIError.message("The server response could not be read")
        }
    }

    private func sendVoid(
        _ path: String,
        method: String,
        body: (any Encodable)? = nil
    ) async throws {
        _ = try await request(path, method: method, body: body, authorized: true)
    }

    private func request(
        _ path: String,
        method: String,
        body: (any Encodable)?,
        authorized: Bool
    ) async throws -> Data {
        guard let url = URL(string: path, relativeTo: baseURL) else {
            throw APIError.message("API address is not valid")
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(AnyEncodable(body))
        }
        if authorized, let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.message("No response from Ledgerline")
        }
        guard (200..<300).contains(http.statusCode) else {
            struct Failure: Decodable { let message: String? }
            let message = (try? JSONDecoder().decode(Failure.self, from: data))?.message
            throw APIError.message(message ?? "Request failed (\(http.statusCode))")
        }
        return data
    }
}

private struct AnyEncodable: Encodable {
    let value: any Encodable
    init(_ value: any Encodable) { self.value = value }
    func encode(to encoder: Encoder) throws { try value.encode(to: encoder) }
}
