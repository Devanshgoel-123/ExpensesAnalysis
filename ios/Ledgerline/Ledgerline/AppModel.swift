import AuthenticationServices
import Foundation
import Observation
import UIKit

@MainActor
@Observable
final class AppModel {
    var user: SessionUser?
    var dashboard: MonthDashboard?
    var gmail: GmailStatus?
    var banks: [BankPreset] = []
    var selectedBank = "HDFC"
    var busy = false
    var error: String?

    private var token: String?
    private let apiBase = LedgerlineAPI.sharedBase
    let webAuth = WebAuthPresenter()

    var isSignedIn: Bool { token != nil }

    func restore() async {
        guard let saved = Keychain.loadToken() else { return }
        token = saved
        await refresh()
    }

    func signIn(identityToken: String, displayName: String?) async {
        busy = true
        error = nil
        defer { busy = false }
        do {
            let api = LedgerlineAPI(baseURL: apiBase)
            let session = try await api.signInWithApple(identityToken: identityToken, displayName: displayName)
            token = session.token
            user = session.user
            Keychain.saveToken(session.token)
            await refresh()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func refresh() async {
        guard let token else { return }
        var api = LedgerlineAPI(baseURL: apiBase)
        api.token = token
        do {
            user = try await api.me()
            let range = MonthRange.current()
            dashboard = try await api.dashboard(from: range.from, to: range.to)
            gmail = try? await api.gmailStatus()
            if banks.isEmpty {
                banks = (try? await api.bankPresets()) ?? []
                if !banks.contains(where: { $0.id == selectedBank }), let first = banks.first {
                    selectedBank = first.id
                }
            }
            error = nil
        } catch {
            if error.localizedDescription.localizedCaseInsensitiveContains("token")
                || error.localizedDescription.localizedCaseInsensitiveContains("unauthorized")
                || error.localizedDescription.contains("401") {
                signOut()
            }
            self.error = error.localizedDescription
        }
    }

    func connectGmail() async {
        guard let token else { return }
        busy = true
        error = nil
        defer { busy = false }
        do {
            var api = LedgerlineAPI(baseURL: apiBase)
            api.token = token
            try await api.saveBank(selectedBank)
            let url = try await api.gmailConnectURL()
            let callback = try await webAuth.start(url: url, callbackScheme: "ledgerline")
            let status = URLComponents(url: callback, resolvingAgainstBaseURL: false)?
                .queryItems?
                .first { $0.name == "status" }?
                .value
            guard status == "connected" else {
                let detail = URLComponents(url: callback, resolvingAgainstBaseURL: false)?
                    .queryItems?
                    .first { $0.name == "detail" }?
                    .value
                throw APIError.message(detail ?? "Gmail was not connected")
            }
            try await api.enableMailSync()
            await refresh()
        } catch {
            if (error as? ASWebAuthenticationSessionError)?.code == .canceledLogin { return }
            self.error = error.localizedDescription
        }
    }

    func deleteAccount() async {
        guard let token else { return }
        busy = true
        defer { busy = false }
        do {
            var api = LedgerlineAPI(baseURL: apiBase)
            api.token = token
            try await api.deleteAccount()
            signOut()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func signOut() {
        Keychain.clearToken()
        token = nil
        user = nil
        dashboard = nil
        gmail = nil
    }
}

enum MonthRange {
    static func current(now: Date = Date()) -> (from: String, to: String) {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Asia/Kolkata") ?? .current
        let parts = calendar.dateComponents([.year, .month], from: now)
        let year = parts.year ?? 2026
        let month = parts.month ?? 1
        let start = String(format: "%04d-%02d-01", year, month)
        let day = calendar.component(.day, from: now)
        let today = String(format: "%04d-%02d-%02d", year, month, day)
        return (start, today)
    }
}

final class WebAuthPresenter: NSObject, ASWebAuthenticationPresentationContextProviding {
    private var session: ASWebAuthenticationSession?

    func start(url: URL, callbackScheme: String) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: callbackScheme) { [weak self] callback, error in
                self?.session = nil
                if let callback {
                    continuation.resume(returning: callback)
                } else {
                    continuation.resume(throwing: error ?? APIError.message("Gmail connect was cancelled"))
                }
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = true
            self.session = session
            session.start()
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}
