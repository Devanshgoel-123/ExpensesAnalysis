import SwiftUI

struct TransactionsView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        NavigationStack {
            Group {
                if let rows = model.dashboard?.transactions, !rows.isEmpty {
                    List(rows) { txn in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(txn.title)
                                    .lineLimit(1)
                                Spacer()
                                Text(signed(txn))
                                    .font(.body.monospacedDigit())
                            }
                            Text("\(txn.date) · \(txn.categoryLabel ?? txn.type)")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                    .listStyle(.plain)
                } else {
                    ContentUnavailableView(
                        "No payments yet",
                        systemImage: "tray",
                        description: Text("Connect Gmail in Settings. Bank mail syncs on the server.")
                    )
                }
            }
            .navigationTitle("Activity")
            .refreshable { await model.refresh() }
        }
    }

    private func signed(_ txn: LedgerTransaction) -> String {
        let value = txn.amount.formatted(.currency(code: "INR").precision(.fractionLength(0)))
        return txn.type == "credit" ? "+\(value)" : value
    }
}
