import SwiftUI

struct SettingsView: View {
    @Environment(AppModel.self) private var model
    @State private var confirmDelete = false

    var body: some View {
        NavigationStack {
            List {
                Section("Account") {
                    LabeledContent("Signed in", value: model.user?.displayName ?? model.user?.email ?? "Apple ID")
                    if let email = model.user?.email {
                        Text(email).font(.footnote).foregroundStyle(.secondary)
                    }
                }
                Section {
                    if model.gmail?.connected == true {
                        LabeledContent("Gmail", value: model.gmail?.email ?? "Connected")
                    } else {
                        Picker("Bank", selection: Bindable(model).selectedBank) {
                            ForEach(model.banks) { bank in
                                Text(bank.label).tag(bank.id)
                            }
                        }
                        Button("Connect Gmail") {
                            Task { await model.connectGmail() }
                        }
                        .disabled(model.busy || model.banks.isEmpty)
                    }
                    Text("Read-only bank mail. Google handles the sign-in. Ledgerline does not see or store that password. Mail is checked on the server every 6 hours.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                } header: {
                    Text("Bank mail")
                }
                Section("Privacy") {
                    Text("Ledgerline shows your own UPI spending. It is not a bank. Sign in with Apple is the only account login. Delete account removes the login and the imported payments.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                Section {
                    Button("Log out", role: .none) { model.signOut() }
                    Button("Delete account", role: .destructive) { confirmDelete = true }
                        .disabled(model.busy)
                }
                if let error = model.error {
                    Section {
                        Text(error).foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Settings")
            .confirmationDialog(
                "Delete this account and its imported payments?",
                isPresented: $confirmDelete,
                titleVisibility: .visible
            ) {
                Button("Delete account", role: .destructive) {
                    Task { await model.deleteAccount() }
                }
            }
        }
    }
}
