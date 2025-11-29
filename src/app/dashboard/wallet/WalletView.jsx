"use client";

export default function WalletView({ data }) {
  const { balance, transactions } = data;

  return (
    <div className="space-y-8">
      {/* Balance Card */}
      <div className="bg-gradient-to-r from-purple-900 to-blue-900 p-8 rounded-2xl border border-purple-500/30 shadow-2xl">
        <h2 className="text-gray-300 text-sm font-medium uppercase tracking-wider mb-2">
          Current Balance
        </h2>
        <div className="text-5xl font-bold text-white">
          {balance}{" "}
          <span className="text-2xl text-gray-400 font-normal">Credits</span>
        </div>
      </div>

      {/* Transactions List */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">
          Transaction History
        </h3>
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No wallet transactions found.
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="p-4 flex justify-between items-center hover:bg-gray-800/50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`font-medium ${t.amount >= 0 ? "text-green-400" : "text-red-400"}`}
                      >
                        {t.amount >= 0 ? "Credit Added" : "Credit Used"}
                      </div>
                      {t.status !== "active" && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded border uppercase ${t.status === "pending"
                            ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                            : t.status === "expired"
                              ? "bg-red-500/10 text-red-500 border-red-500/20"
                              : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                            }`}
                        >
                          {t.status}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(t.createdAt).toLocaleDateString()}
                      {t.status === "pending" && (
                        <span className="ml-2 text-xs text-yellow-500/70">
                          (Activates on shoot completion)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-bold ${t.amount >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {t.amount > 0 ? "+" : ""}
                      {t.amount}
                    </div>
                    {t.creditExpiresAt && (
                      <div className="text-xs text-gray-500">
                        Expires:{" "}
                        {new Date(t.creditExpiresAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
