class ResultRow {
	constructor(player1Idx, player2Idx, result = "-") {
		this.player1Idx = player1Idx;
		this.player2Idx = player2Idx;
		this.result = result;
	}
}

function resultToValue(result) {
	switch (result) {
		case "1":
			return 1;
		case "0":
		case "0-0":
			return 0;
		case "0.5":
			return 0.5;
		default:
			console.error("result data can't be used as value now");
	}
	throw new Error("result data can't be used as value now");
}

export function invertedResult(result) {
	switch (result) {
		case "1":
			return "0";
		case "0":
			return "1";
		case "0.5":
		case "0-0":
		default:
			;
	}
	return result;
}

function createResultRows(pairings) {
	return pairings.map((round) =>
		round.map((pair) => new ResultRow(pair[0], pair[1], "-"))
	);
}

function isPerformanceResult(result) {
	return result === "1" || result === "0" || result === "0.5";
}

const FIDE_DP_TABLE = {
	0.00: -800,
	0.01: -677,
	0.02: -589,
	0.03: -538,
	0.04: -501,
	0.05: -470,
	0.06: -444,
	0.07: -422,
	0.08: -401,
	0.09: -383,
	0.10: -366,
	0.11: -351,
	0.12: -336,
	0.13: -322,
	0.14: -309,
	0.15: -296,
	0.16: -284,
	0.17: -273,
	0.18: -262,
	0.19: -251,
	0.20: -240,
	0.21: -230,
	0.22: -220,
	0.23: -211,
	0.24: -202,
	0.25: -193,
	0.26: -184,
	0.27: -175,
	0.28: -166,
	0.29: -158,
	0.30: -149,
	0.31: -141,
	0.32: -133,
	0.33: -125,
	0.34: -117,
	0.35: -110,
	0.36: -102,
	0.37: -95,
	0.38: -87,
	0.39: -80,
	0.40: -72,
	0.41: -65,
	0.42: -57,
	0.43: -50,
	0.44: -43,
	0.45: -36,
	0.46: -29,
	0.47: -21,
	0.48: -14,
	0.49: -7,
	0.50: 0,
	0.51: 7,
	0.52: 14,
	0.53: 21,
	0.54: 29,
	0.55: 36,
	0.56: 43,
	0.57: 50,
	0.58: 57,
	0.59: 65,
	0.60: 72,
	0.61: 80,
	0.62: 87,
	0.63: 95,
	0.64: 102,
	0.65: 110,
	0.66: 117,
	0.67: 125,
	0.68: 133,
	0.69: 141,
	0.70: 149,
	0.71: 158,
	0.72: 166,
	0.73: 175,
	0.74: 184,
	0.75: 193,
	0.76: 202,
	0.77: 211,
	0.78: 220,
	0.79: 230,
	0.80: 240,
	0.81: 251,
	0.82: 262,
	0.83: 273,
	0.84: 284,
	0.85: 296,
	0.86: 309,
	0.87: 322,
	0.88: 336,
	0.89: 351,
	0.90: 366,
	0.91: 383,
	0.92: 401,
	0.93: 422,
	0.94: 444,
	0.95: 470,
	0.96: 501,
	0.97: 538,
	0.98: 589,
	0.99: 677,
	1.00: 800,
};

function getFidePerformanceDelta(scoreRate) {
	// FIDE publishes the dp table in 0.01 score increments. For score rates
	// that do not land exactly on a table row, snap to the nearest published row.
	const normalizedScore = Math.min(1, Math.max(0, scoreRate));
	const roundedScore = Math.round(normalizedScore * 100) / 100;
	return FIDE_DP_TABLE[roundedScore];
}

function calculatePerformanceFromScore(avgOpponentElo, scoreRate) {
	return Math.round(avgOpponentElo + getFidePerformanceDelta(scoreRate));
}

function getBergerPairingsIdx(size) {
	if (typeof globalThis.generateBergerPairingsIdx !== "function") {
		throw new Error("generateBergerPairingsIdx is not available");
	}
	return globalThis.generateBergerPairingsIdx(size);
}

export class Tournament {
	static MUTUAL_RESULTS_CRIT = "_Same_group";
	static SONNEBORG_BERGER_CRIT = "_Sonneborg-Berger";
	static WINS_CRIT = "_Wins";
	static criteriaList = [
		[
			Tournament.MUTUAL_RESULTS_CRIT,
			Tournament.SONNEBORG_BERGER_CRIT,
			Tournament.WINS_CRIT,
		],
		[
			Tournament.MUTUAL_RESULTS_CRIT,
			Tournament.SONNEBORG_BERGER_CRIT,
		],
		[
			Tournament.SONNEBORG_BERGER_CRIT,
			Tournament.MUTUAL_RESULTS_CRIT,
			Tournament.WINS_CRIT,
		],
		[
			Tournament.SONNEBORG_BERGER_CRIT,
			Tournament.MUTUAL_RESULTS_CRIT,
		],
		[ Tournament.SONNEBORG_BERGER_CRIT ],
		[],
	];

	constructor() {
		this.tournamentInfo = this.createTournamentInfo();
		this.players = [];
		this.rounds = [];
	}

	createTournamentInfo() {
		return {
			id: null,
			werePlayersRandomized: false,
			numCycles: 1,
			finalStandingsResolvers: [
				Tournament.MUTUAL_RESULTS_CRIT,
				Tournament.SONNEBORG_BERGER_CRIT,
				Tournament.WINS_CRIT,
			],
		};
	}

	saveData() {
		this.savedAt = Date.now();
		localStorage.setItem("tournamentData", JSON.stringify(this));
	}

	loadData() {
		let tournamentData = JSON.parse(localStorage.getItem("tournamentData"));
		if (tournamentData) {
			const now = Date.now();
			const maxAge = 48 * 60 * 60 * 1000;
			if (!tournamentData.savedAt || now - tournamentData.savedAt > maxAge) {
				return;
			}
			this.players = tournamentData.players || [];
			this.rounds = tournamentData.rounds || [];
			this.tournamentInfo =
				tournamentData.tournamentInfo || this.createTournamentInfo();
		}
	}

	generateRandomId() {
		return Math.floor(Math.random() * 1e10 + 1e10).toString(16);
	}

	hasTornamentId() {
		return this.tournamentInfo.id !== null;
	}

	addPlayer(name, Elo, bye) {
		this.players.push({ name: name, Elo: Number(Elo), bye: bye });
		this.saveData();
	}

	removePlayer(idx) {
		this.players.splice(idx, 1);
		this.saveData();
	}

	lookupPlayerIndex(name) {
		return this.players.findIndex((player) => player.name === name);
	}

	setResult(roundIndex, resultRow, result) {
		this.rounds[roundIndex][resultRow].result = result;
		this.saveData();
	}

	getPlayer(idx) {
		if (idx < 0 || idx > this.players.length) {
			console.error("player index out of range");
			throw new Error("player index out of range");
		}
		return this.players[idx];
	}

	sortPlayers() {
		this.players.sort((a, b) => b.Elo - a.Elo);
		this.saveData();
	}

	randomizePlayers() {
		for (let i = this.players.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.players[i], this.players[j]] = [this.players[j], this.players[i]];
		}
		this.tournamentInfo.werePlayersRandomized = true;
		this.saveData();
	}

	addByeIfNeeded() {
		if (this.players.length % 2 !== 0) {
			this.players.push({ name: "Bye", Elo: 1400, bye: true });
		}
	}

	clearResults() {
		this.rounds = [];
		this.saveData();
	}

	generatePairings(method) {
		this.rounds = getBergerPairingsIdx(this.players.length);
		this.rounds = createResultRows(this.rounds);
		this.tournamentInfo.numCycles = 1;

		console.assert(!this.hasTornamentId());
		this.tournamentInfo.id = this.generateRandomId();
		this.saveData();
	}

	extraCycle() {
		let newCycle = getBergerPairingsIdx(this.players.length);
		let cycle1 = createResultRows(newCycle);
		let cycle2 = newCycle.map((round) =>
			round.map((pair) => new ResultRow(pair[1], pair[0], "-"))
		);

		if (this.tournamentInfo.numCycles % 2 == 1) {
			this.rounds = this.rounds.concat(cycle2);
		} else {
			this.rounds = this.rounds.concat(cycle1);
		}
		this.tournamentInfo.numCycles += 1;
		this.saveData();
	}

	calculateStandings() {
		let standings = this.players.map((player) => ({
			name: player.name,
			elo: player.Elo,
			points: 0,
			performance: null,
			additionalCriteria: new Array(
				this.tournamentInfo.finalStandingsResolvers.length
			).fill(0),
		}));

		this.calcPoints(standings);

		for (
			let idx = 0;
			idx < this.tournamentInfo.finalStandingsResolvers.length;
			idx++
		) {
			let method = this.tournamentInfo.finalStandingsResolvers[idx];
			switch (method) {
				case Tournament.MUTUAL_RESULTS_CRIT:
					this.calcSameGroupScore(standings, idx);
					break;
				case Tournament.SONNEBORG_BERGER_CRIT:
					this.calcSonneborgBerger(standings, idx);
					break;
				case Tournament.WINS_CRIT:
					this.calcWins(standings, idx);
					break;
				default:
					console.error("unknown method");
			}
		}

		this.calcPerformance(standings);

		standings.sort((a, b) => {
			if (b.points !== a.points) {
				return b.points - a.points;
			}
			for (
				let idx = 0;
				idx < this.tournamentInfo.finalStandingsResolvers.length;
				idx++
			) {
				if (a.additionalCriteria[idx] !== b.additionalCriteria[idx]) {
					return b.additionalCriteria[idx] - a.additionalCriteria[idx];
				}
			}
			return 0;
		});

		return standings;
	}

	calcPoints(standings) {
		this.rounds.forEach((round) => {
			round.forEach((resultRow) => {
				let player1 = standings[resultRow.player1Idx];
				let player2 = standings[resultRow.player2Idx];
				let result = resultRow.result;
				switch (result) {
					case "1":
					case "0":
					case "0.5":
					case "0-0":
						player1.points += resultToValue(result);
						player2.points += resultToValue(invertedResult(result));
						break;
					default:
						;
				}
			});
		});
	}

	calcSonneborgBerger(standings, critIdx) {
		this.rounds.forEach((round) => {
			round.forEach((resultRow) => {
				let player1 = standings[resultRow.player1Idx];
				let player2 = standings[resultRow.player2Idx];
				switch (resultRow.result) {
					case "1":
						player1.additionalCriteria[critIdx] += player2.points;
						break;
					case "0":
						player2.additionalCriteria[critIdx] += player1.points;
						break;
					case "0.5":
						player1.additionalCriteria[critIdx] += player2.points * 0.5;
						player2.additionalCriteria[critIdx] += player1.points * 0.5;
						break;
					default:
						;
				}
			});
		});
	}

	calcSameGroupScore(standings, critIdx) {
		this.rounds.forEach((round) => {
			round.forEach((resultRow) => {
				let player1 = standings[resultRow.player1Idx];
				let player2 = standings[resultRow.player2Idx];

				if (player1.points === player2.points) {
					switch (resultRow.result) {
						case "1":
						case "0":
						case "0.5":
						case "0-0":
							player1.additionalCriteria[critIdx] += resultToValue(resultRow.result);
							player2.additionalCriteria[critIdx] += resultToValue(
								invertedResult(resultRow.result)
							);
							break;
						default:
							;
					}
				}
			});
		});
	}

	calcWins(standings, critIdx) {
		this.rounds.forEach((round) => {
			round.forEach((resultRow) => {
				let player1 = standings[resultRow.player1Idx];
				let player2 = standings[resultRow.player2Idx];
				switch (resultRow.result) {
					case "1":
					case "0":
						player1.additionalCriteria[critIdx] += resultToValue(resultRow.result);
						player2.additionalCriteria[critIdx] += resultToValue(
							invertedResult(resultRow.result)
						);
						break;
					default:
						;
				}
			});
		});
	}

	calcPerformance(standings) {
		const performanceData = standings.map(() => ({
			opponentEloSum: 0,
			scoreSum: 0,
			gamesCount: 0,
		}));

		this.rounds.forEach((round) => {
			round.forEach((resultRow) => {
				const result = resultRow.result;
				const player1 = this.players[resultRow.player1Idx];
				const player2 = this.players[resultRow.player2Idx];

				if (!isPerformanceResult(result) || player1?.bye || player2?.bye) {
					return;
				}

				performanceData[resultRow.player1Idx].opponentEloSum += player2.Elo;
				performanceData[resultRow.player1Idx].scoreSum += resultToValue(result);
				performanceData[resultRow.player1Idx].gamesCount += 1;

				performanceData[resultRow.player2Idx].opponentEloSum += player1.Elo;
				performanceData[resultRow.player2Idx].scoreSum += resultToValue(
					invertedResult(result)
				);
				performanceData[resultRow.player2Idx].gamesCount += 1;
			});
		});

		standings.forEach((standing, idx) => {
			const { opponentEloSum, scoreSum, gamesCount } = performanceData[idx];
			if (gamesCount === 0) {
				standing.performance = null;
				return;
			}

			const avgOpponentElo = opponentEloSum / gamesCount;
			const scoreRate = scoreSum / gamesCount;
			standing.performance = calculatePerformanceFromScore(
				avgOpponentElo,
				scoreRate
			);
		});
	}
}

export function getCriteriumVisibleName(crit) {
	switch (crit) {
		case Tournament.MUTUAL_RESULTS_CRIT:
			return "Mutual results";
		case Tournament.SONNEBORG_BERGER_CRIT:
			return "Berger Score";
		case Tournament.WINS_CRIT:
			return "More Wins";
		default:
			console.error("unknown criterium: '" + crit + "'");
			return "????";
	}
}
