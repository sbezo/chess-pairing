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
