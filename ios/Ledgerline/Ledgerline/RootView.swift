import AuthenticationServices
import SwiftUI

struct RootView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        Group {
            if model.isSignedIn {
                MainView()
            } else {
                SignInView()
            }
        }
        .task { await model.restore() }
    }
}

struct SignInView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: 28) {
            Spacer()
            Text("Ledgerline")
                .font(.largeTitle.weight(.semibold))
            Text("See where the money went. Sign in with Apple. This app never asks for a password.")
                .foregroundStyle(.secondary)
            SignInWithAppleButton(.signIn) { request in
                request.requestedScopes = [.fullName, .email]
            } onCompletion: { result in
                switch result {
                case .success(let authorization):
                    guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                          let tokenData = credential.identityToken,
                          let token = String(data: tokenData, encoding: .utf8)
                    else {
                        model.error = "Apple did not return a sign-in token"
                        return
                    }
                    let name = [credential.fullName?.givenName, credential.fullName?.familyName]
                        .compactMap { $0 }
                        .joined(separator: " ")
                    Task {
                        await model.signIn(identityToken: token, displayName: name.isEmpty ? nil : name)
                    }
                case .failure(let error):
                    if (error as? ASAuthorizationError)?.code == .canceled { return }
                    model.error = error.localizedDescription
                }
            }
            .signInWithAppleButtonStyle(.white)
            .frame(height: 48)
            if let error = model.error {
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }
            Spacer()
        }
        .padding(24)
    }
}

struct MainView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        TabView {
            OverviewView()
                .tabItem { Label("Overview", systemImage: "chart.bar") }
            TransactionsView()
                .tabItem { Label("Activity", systemImage: "list.bullet") }
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape") }
        }
        .tint(Color(red: 0.85, green: 0.55, blue: 0.42))
    }
}
