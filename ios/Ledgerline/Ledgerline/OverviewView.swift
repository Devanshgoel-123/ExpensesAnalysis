import SwiftUI

struct OverviewView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if let summary = model.dashboard?.summary {
                        Text(inr(summary.totalSpent))
                            .font(.system(size: 42, weight: .semibold, design: .rounded))
                        Text("\(summary.transactionCount) debits · \(inr(summary.avgDailySpend)) a day")
                            .foregroundStyle(.secondary)
                        DayBars(days: bars)
                            .frame(height: 140)
                    } else if model.error == nil {
                        ProgressView("Loading this month")
                    }
                    if let error = model.error {
                        Text(error).font(.footnote).foregroundStyle(.red)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(20)
            }
            .navigationTitle(monthTitle)
            .refreshable { await model.refresh() }
        }
    }

    private var monthTitle: String {
        let range = MonthRange.current()
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone(identifier: "Asia/Kolkata")
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: range.from) else { return "Overview" }
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: date)
    }

    private var bars: [DaySpend] {
        let range = MonthRange.current()
        let amounts = Dictionary(uniqueKeysWithValues: (model.dashboard?.daily ?? []).map { ($0.date, $0.amount) })
        return dates(from: range.from, through: range.to).map { date in
            DaySpend(date: date, amount: amounts[date] ?? 0)
        }
    }

    private func dates(from start: String, through end: String) -> [String] {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone(identifier: "Asia/Kolkata")
        formatter.dateFormat = "yyyy-MM-dd"
        guard var cursor = formatter.date(from: start), let last = formatter.date(from: end) else { return [] }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = formatter.timeZone
        var days: [String] = []
        while cursor <= last {
            days.append(formatter.string(from: cursor))
            guard let next = calendar.date(byAdding: .day, value: 1, to: cursor) else { break }
            cursor = next
        }
        return days
    }

    private func inr(_ amount: Double) -> String {
        amount.formatted(.currency(code: "INR").precision(.fractionLength(0)))
    }
}

struct DayBars: View {
    let days: [DaySpend]

    var body: some View {
        let peak = max(days.map(\.amount).max() ?? 0, 1)
        HStack(alignment: .bottom, spacing: 4) {
            ForEach(days) { day in
                RoundedRectangle(cornerRadius: 3, style: .continuous)
                    .fill(day.amount > 0 ? Color(red: 0.85, green: 0.55, blue: 0.42) : Color.white.opacity(0.08))
                    .frame(maxWidth: 12)
                    .frame(height: max(4, CGFloat(day.amount / peak) * 120))
            }
            Spacer(minLength: 0)
        }
    }
}
