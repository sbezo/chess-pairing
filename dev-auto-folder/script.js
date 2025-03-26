
import { FeatPersistentCookie } from './modules/FeatPersistentCookie.js'

class ResultRow {
	constructor(player1Idx, player2Idx, result="-") {
		this.player1Idx = player1Idx
		this.player2Idx = player2Idx
		this.result = result
	}
}

// model class - only data and operations on it, no DOM usage
// all data is stored here
// can be separate js module
class Tournament {
	// need some strings for JSON
	static MUTUAL_RESULTS_CRIT = "_Same_group";
	static SONNEBORG_BERGER_CRIT = "_Sonneborg-Berger";
	static WINS_CRIT = "_Wins";

	static criteriaList = [
		[ Tournament.MUTUAL_RESULTS_CRIT, Tournament.SONNEBORG_BERGER_CRIT, Tournament.WINS_CRIT ],
		[ Tournament.MUTUAL_RESULTS_CRIT, Tournament.SONNEBORG_BERGER_CRIT ],
		[ Tournament.SONNEBORG_BERGER_CRIT, Tournament.MUTUAL_RESULTS_CRIT, Tournament.WINS_CRIT ],
		[ Tournament.SONNEBORG_BERGER_CRIT, Tournament.MUTUAL_RESULTS_CRIT],
		[ Tournament.SONNEBORG_BERGER_CRIT],
		[],
		]

	constructor() {
		this.tournamentInfo = this.createTournamentInfo() 

		this.players = [], // [ player = { name, Elo, bye (opt)}, ... ]
		this.rounds = [] // [ round [ ResutRow ,... ], ... ] 

		this.cookieStorage = new FeatPersistentCookie() 
	}

	createTournamentInfo() {
		return { 

			// generate random hex string (used for save to distinguish files)
			// stays same for one tournament
			// will be generated, when pairing is done or on first save action
			// after browser refresh, it will be loaded from cookies (if allowed)
			id : null,

			// next are not implemented yet
			seed : "", // TODO: generated (to check correctness of pairings for purists)
			title : "", // opt
			date : "", // opt
			location_ : "", // opt

			werePlayersRandomized : false,
			double_rounded : false,
			pairing_version : 1,

			// the order is priority
			finalStandingsResolvers : [
				Tournament.MUTUAL_RESULTS_CRIT,
				Tournament.SONNEBORG_BERGER_CRIT,
				Tournament.WINS_CRIT
			]
		}
	}

	saveToCookie() {
		try {
			if(! CookieConsent.acceptedCategory('Tournament')){
				return
			}
			let data = {}
			let players_copy = this.players.slice()
			data.players = players_copy.map(p => { 
				return {'name' : p.name, 'rating' : p.Elo} })
			data.results = []

			this.rounds.forEach((round, round_i) => {
				round.forEach((resultRecord, rec_i) => {
					data.results.push(result_to_save_id(this.rounds[round_i][rec_i].result))
				})
			})
			data.tournamentInfo = this.tournamentInfo
			this.cookieStorage.saveAll('trndata', data)
		}
		catch(e) {
			console.log(e)
		}
	}
		
	generateRandomId() {
		// generate random hex string
		return Math.floor((Math.random()* 1e10 + 1e10)).toString(16)
	}

	hasTornamentId() {
		return this.tournamentInfo.id !== null
	}

	addPlayer(name, Elo, bye /*opt*/) {
		// if 'bye' set to something other then null, it is bye 
		// 'bye' variable not used anywhere now
		this.players.push({ name: name, Elo: Number(Elo), bye: bye });
		this.saveToCookie()
	}
	
	removePlayer(idx) {
		this.players.splice(idx, 1); // Remove from players array
		this.saveToCookie()
	}
	
	lookupPlayerIndex(name) {
	    // return index of requested player
	    return this.players.findIndex(player => player.name === name);
	}

	setResult(roundIndex, resultRow, result) {
		if (roundIndex > this.rounds.length || resultRow > this.rounds[roundIndex].length) {
			throw new Error("round or row index out of range");
		}
    	this.rounds[roundIndex][resultRow].result = result;
		this.saveToCookie()
	}

	getPlayer(idx) {
		if (idx <0 || idx > this.players.length) {
			console.error("player index out of range");
			throw new Error("player index out of range"); 
		}
		return this.players[idx];
	}

	sortPlayers() {
		this.players.sort((a, b) => b.Elo - a.Elo); // Sort players by Elo in descending order
		this.saveToCookie()
	}

	randomizePlayers() {
		for (let i = this.players.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.players[i], this.players[j]] = [this.players[j], this.players[i]];
		}
		this.tournamentInfo.werePlayersRandomized = true
		this.saveToCookie()
	}

	addByeIfNeeded() {
	    // Add a "Bye" player if the number of players is odd
	    if (this.players.length % 2 !== 0) {
        	this.players.push({ name: "Bye", Elo: 1400 , bye: true});
    	}
	}

	clearResults() {
		this.rounds = [];
		this.saveToCookie()
	}

	generatePairingsForCookieLoad(number_of_players, method) {
		// now only Berger method is supported
	    this.rounds = generateBergerPairingsIdx(number_of_players);

    	// Add result to the pairings - "1" or "0" or "0.5" or ""
		// brx: changing pair[3] to ResultRow hard way
		for (let i=0; i<this.rounds.length; i++) {
			for (let y=0; y < this.rounds[i].length; y++) {
				this.rounds[i][y] = new ResultRow(this.rounds[i][y][0], this.rounds[i][y][1], "-");	
			}
		}

//		console.assert(!this.hasTornamentId())
//		this.tournamentInfo.id = this.generateRandomId()
//		this.saveToCookie()
	}

	generatePairings(method) {
		// now only Berger method is supported
	    this.rounds = generateBergerPairingsIdx(this.players.length);

    	// Add result to the pairings - "1" or "0" or "0.5" or ""
		// brx: changing pair[3] to ResultRow hard way
		for (let i=0; i<this.rounds.length; i++) {
			for (let y=0; y < this.rounds[i].length; y++) {
				this.rounds[i][y] = new ResultRow(this.rounds[i][y][0], this.rounds[i][y][1], "-");	
			}
		}

		console.assert(!this.hasTornamentId())
		this.tournamentInfo.id = this.generateRandomId()
		this.saveToCookie()
	}

	calculateStandings() {
		let standings = this.players.map(player => ({
			name: player.name,
			elo: player.Elo,
			points: 0,
			//berger: 0,
			additionalCriteria: 
			  new Array(this.tournamentInfo.finalStandingsResolvers.length).fill(0)
		}));

		this.calcPoints(standings)

		// calculate additional criteria
		for (let idx = 0;
			idx < this.tournamentInfo.finalStandingsResolvers.length;
			idx++)
		{
			let method = this.tournamentInfo.finalStandingsResolvers[idx]
			switch(method) {
				case Tournament.MUTUAL_RESULTS_CRIT:
					this.calcSameGroupScore(standings, idx)
					break
				case Tournament.SONNEBORG_BERGER_CRIT:
					this.calcSonneborgBerger(standings, idx)
					break
				case Tournament.WINS_CRIT:
					this.calcWins(standings, idx)
					break
				default:
					console.error("unknown method")
			}
		};

		// sort it all, use all criteria at once
		standings.sort((a, b) => {
			if (b.points !== a.points) {
				return b.points - a.points; // Sort by points
			} else {
				// sort by additional criteria
				for (let idx = 0; 
					idx< this.tournamentInfo.finalStandingsResolvers.length; 
					idx++) {

					if (a.additionalCriteria[idx] !== b.additionalCriteria[idx]) {
						return b.additionalCriteria[idx] - a.additionalCriteria[idx]
					}
				}
				return 0
			}
		});

		return standings
	}

	// Calculate points
	calcPoints(standings) {
		this.rounds.forEach(round => {
			round.forEach(resultRow => {
				let player1 = standings[resultRow.player1Idx];
				let player2 = standings[resultRow.player2Idx];

				let result = resultRow.result
				switch(result) {
					case "1":
					case "0":
					case "0.5":
					case "0-0":
						player1.points += resultToValue(result);
						player2.points += resultToValue(invertedResult(result));
						break
					default:
						;
				}
			});
		});
	}

	// Calculate Neustadtl Sonneborn–Berger score
	calcSonneborgBerger(standings, critIdx) {
		this.rounds.forEach(round => {
			round.forEach(resultRow => {
				let player1 = standings[resultRow.player1Idx];
				let player2 = standings[resultRow.player2Idx];
				switch(resultRow.result) {
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

	// Calculate mutual results 
	calcSameGroupScore(standings, critIdx) {
		this.rounds.forEach(round => {
			round.forEach(resultRow => {
				let player1 = standings[resultRow.player1Idx];
				let player2 = standings[resultRow.player2Idx];

				if (player1.points === player2.points) {
					switch(resultRow.result) {
						case "1":
						case "0":
						case "0.5":
						case "0-0":
							player1.additionalCriteria[critIdx] += 
								resultToValue(resultRow.result);
							player2.additionalCriteria[critIdx] += 
								resultToValue(invertedResult(resultRow.result));
							break;
						default:
							;
					}
				}
			});
		});
	}

	// brx: solves case when more than 2 players have same score
	// Calculate 'More wins better' criterium
	calcWins(standings, critIdx) {
		this.rounds.forEach(round => {
			round.forEach(resultRow => {
				let player1 = standings[resultRow.player1Idx];
				let player2 = standings[resultRow.player2Idx];
				switch(resultRow.result) {
					case "1":
					case "0":
						player1.additionalCriteria[critIdx] += 
							resultToValue(resultRow.result);
						player2.additionalCriteria[critIdx] += 
							resultToValue(invertedResult(resultRow.result));
						break;
					default:
						;
				}
			});
		});
	}
}

function getCriteriumVisibleName(crit) {
	switch(crit) {
		case Tournament.MUTUAL_RESULTS_CRIT:
			return "Mutual results"
		case Tournament.SONNEBORG_BERGER_CRIT:
			return "Berger Score"
		case Tournament.WINS_CRIT:
			return "More Wins"
		default:
			console.error("unknown criterium: '" + crit + "'")
			return "????"
	}
}


function invertedResult(result) {
	switch(result) {
		case "1": 
			return "0"
		case "0":
			return "1"
		case "0.5":
		case "0-0":
		default:
			;
	}
	return result
}

function resultToValue(result) {
	switch(result) {
		case "1": 
			return 1
		case "0":
		case "0-0":
			return 0
		case "0.5":
			return 0.5
		default:
			console.error("result data can't be used as value now");
	}
	throw new Error("result data can't be used as value now");
}

function result_to_save_id(result) {
	switch(result) {
		case "0":
			return 1
		case "0.5":
			return 2
		case "1":
			return 3
		case "0-0":
			return 4
		default:
			return 0
	}
}

function result_from_save_id(result) {
	let pos = [ '-', '0', '0.5', '1', '0-0' ]

	if (result >= 0 && result < pos.length)
		return pos[result]
	// ? log error ?
	return '-'
}

// ************************************************************


class Controller {
	static COOKIE_ID = "tournament-id="

	constructor(tournament_data) {
		this.data = tournament_data
	}

	initialize() {
		// https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie
		
		try {
			let cookies = document.cookie.split(";").map((x) => x.trim())

			cookies.forEach(cookie => {
				if (cookie.startsWith(Controller.COOKIE_ID)) {
					let data = cookie.split('=')
					if (data[1] !== "") {
						this.data.tournamentInfo.id = data[1]
					}
				}
			});	
		}
		catch(error) {
			;
		}
		this.loadFromCookie()
	}

	loadFromCookie() {
		try {
			if(! CookieConsent.acceptedCategory('Tournament')){
				return
			}
			let cookie_data = this.data.cookieStorage.loadAll('trndata')
			if (cookie_data !== null) {
				let data = {}
				// remap 'ratings' to 'Elo'
				data.players = cookie_data.players.map(p => { 
					return {'name' : p.name, 'Elo' : p.rating} })

				if (cookie_data.results.length) {
					this.data.generatePairingsForCookieLoad(data.players.length)
				}

				// recreate results
				data.rounds = this.data.rounds

				let idx = 0
				data.rounds.forEach((round, round_i) => {
					round.forEach((resultRecord, rec_i) => {
						data.rounds[round_i][rec_i].result =
							result_from_save_id(cookie_data.results[idx])
						idx++
					})
				})

				// recreate tournament inf
				data.tournamentInfo = this.data.createTournamentInfo()

				data.tournamentInfo = cookie_data.tournamentInfo

				this._loadAllPart2(data)
			}
		}
		catch(e) {
			console.log("This is catched exception. This is not error, if cookie for Tournament data was disabled.\n" + e)
		}
	}

	saveToCookie() {
		this.data.saveToCookie()
	}

	setCookie(tournament_id) {
		if(CookieConsent.acceptedCategory('Tournament')){
			document.cookie= `${Controller.COOKIE_ID}${tournament_id}; max-age=999999;`
		}
	}

	newTournament(confirmed = false) {
		if (!confirmed) {
			if (!confirm("THIS WILL DELETE ALL CURRENT DATA,\nPROCEED ?")) {
				return
			}
		}

		this.clearAll()
	}

	clearAll() {
		// clear all Tournament data
		this.data = new Tournament()

		this.clearPlayersTable()
		this.clearResultsTab()
		this.clearCrosstableTab()
		this.clearStandingsTab()

		// set no criteria names in standing table
		this.updateStandingTableNames([])

		this.setCookie("")
		this.unlockWidgets()
		this.saveToCookie()
	}

	unlockWidgets() {
		document.getElementById("name").disabled = false;
		document.getElementById("Elo").disabled = false;

		// Enable buttons
		document.querySelectorAll('#tab1 .button-container button').forEach(button => {
			button.disabled = false;
		});
		
		// Optionally, add a visual indication that the table is locked
		document.getElementById("dataTable").classList.remove('locked');
		document.getElementById("criteria").disabled = false;
	}

	lockWidgets() {
		// Disable input fields
		document.getElementById("name").disabled = true;
		document.getElementById("Elo").disabled = true;

		// Disable buttons
		document.querySelectorAll('#tab1 .button-container button').forEach(button => {
			button.disabled = true;
		});
		
		// Optionally, add a visual indication that the table is locked
		document.getElementById("dataTable").classList.add('locked');
		document.getElementById("criteria").disabled = true;
	}

	lockAndPairing() {
		if (this.data.players.length < 2) {
			alert("Not enought players")
			return
		}

		if (!this.data.tournamentInfo.werePlayersRandomized) {
			if (!confirm("The order of players should be randomized.\nDo you want to proceed without randomizing the order ?")) {
				return
			}
		}
		// TODO: confirm final standing criteria before lock

		// Update the standings table names (dynamic criteria)
		this.updateStandingTableNames(this.data.tournamentInfo.finalStandingsResolvers)

		// Add a "Bye" player if the number of players is odd
		this.data.addByeIfNeeded();

		this.updatePlayersTable();

		// Generate pairings
		this.generatePairings("Berger")

		// Create tabs for all rounds
		for (let i = 1; i <= (this.data.rounds.length); i++) {
			this.createRoundTab(i);
		}

		// Generate empty cross table
		this.generateCrossTable();

		this.lockWidgets()

		this.openTab('tab2')

		// Make round 1 active tab
		this.openRound(1);

		this.saveToCookie()
	}

	openRound(roundNumber) {
		const roundTabs = document.querySelectorAll(".round-tab");
		const roundContents = document.querySelectorAll(".round-content");

		roundTabs.forEach(tab => tab.classList.remove("active"));
		roundContents.forEach(content => content.classList.remove("active"));

		document.querySelector(`.round-tab:nth-child(${roundNumber})`).classList.add("active");
		document.getElementById(`round${roundNumber}`).classList.add("active");
	}

	openTab(tabId) {
		let tabs = document.querySelectorAll('.tab-content');
		let tabButtons = document.querySelectorAll('.tab');

		tabs.forEach(tab => tab.classList.remove('active'));
		tabButtons.forEach(tab => tab.classList.remove('active'));

		document.getElementById(tabId).classList.add('active');
		document.querySelector(`.tab-container .tab[onclick="app.openTab('${tabId}')"]`).classList.add('active');
		if (tabId === "tab4") {
			this.calculateStandings();
		}
	}

	importDemo(confirmed = false) {
		let players = [
			{"name": "Magnus", "Elo": 2833},
			{"name": "Fabiano", "Elo": 2803},
			{"name": "Hikaru", "Elo": 2802},
			{"name": "Arjun", "Elo": 2801},
			{"name": "Gukesh", "Elo": 2777},
			{"name": "Nodirbek", "Elo": 2766},
			{"name": "Alireza", "Elo": 2760},
			{"name": "Yi", "Elo": 2755},
			{"name": "Ian", "Elo": 2754},
			{"name": "Anand", "Elo": 2750}
		]

		players.forEach(player => {
			// batch mode
			this.addPlayerToTable_2(player.name, player.Elo, true);
		})
		
		this.updatePlayersTable();
	}

	generatePairings(method) {
		this.data.generatePairings(method)

		this.setCookie(this.data.tournamentInfo.id)
	}

	// ************************************************************
	// save & load

	saveAll() {
		if (!this.data.hasTornamentId()) {
			// create cookie if there is none (case: pairing was not generated yet)
			this.data.tournamentInfo.id = this.data.generateRandomId()
			this.setCookie(this.data.tournamentInfo.id)
		}

		// brx: changed to save all data
		const jsonContent = JSON.stringify(this.data);

		// fail: firefox on mobile: opens file instead of download
		//const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8" }); //vytvori binarny objekt, ktory bude obsahovat json data
		
		// TODO: test: application/octet-stream
		// TODO: test: const blob = new Blob([jsonContent], { type: "text/plain;charset=utf-8" }); 
		const blob = new Blob([jsonContent], { type: "data: attachement/file;charset=utf-8" }); //vytvori binarny objekt, ktory bude obsahovat json data

		const url = URL.createObjectURL(blob); //vytvori temporrary URL pre tento objekt
		const link = document.createElement("a"); //vytvori anchor element, ktory bude pouzity na ulozenie Blob contentu

		link.href = url;
		link.download = "tournament-" + this.data.tournamentInfo.id + ".json";
		document.body.appendChild(link); //vlozi link do body dokumentu, neskor sa nan programom klikne
		link.click(); //simuluje click to anchor element
		document.body.removeChild(link); // odstrani element z body dokumentu
		URL.revokeObjectURL(url); // Clean up the URL object
	}

	loadAll(event) {
		const file = event.target.files[0];
		const reader = new FileReader();

		// save instance of class to reader object to some unique variable
		reader.source_app_392483928 = this
		reader.onload = function(e) {

			// app_inst is our saved app instance, because we are in FileReader object ('this' = FileReader)
			let app_inst = e.target.source_app_392483928
			const text = e.target.result;
			try {
				// brx: load all data instead
				const data_loaded = JSON.parse(text); // Parse the JSON content

				
				if (app_inst.data.hasTornamentId() && app_inst.data.tournamentInfo.id !== data_loaded.tournamentInfo.id) {
					if (!confirm("Data from file are not for current tournament.\nCurrent tournament has id: " 
						+ app_inst.data.tournamentInfo.id + "\nThis id should be in loaded file name for same tournament.\nReplace ?")) {
						return;
					}
				}

				app_inst._loadAllPart2(data_loaded)
			} catch (error) {
				console.error('Error parsing JSON:', error);
			}
		};
		reader.readAsText(file);
	}

	_loadAllPart2(data_loaded) {
		// Apply all data to DOM	

		this.clearResultsTab(); // Clear existing results in pairing subtabs for each round
		this.clearCrosstableTab(); // Clear existing cross table

		this.data.players = data_loaded.players;
		this.data.rounds = data_loaded.rounds;
		this.data.tournamentInfo = data_loaded.tournamentInfo;
	
		this.updateCriteriaForm(this.data.tournamentInfo.finalStandingsResolvers)

		// Update the standings table names
		this.updateStandingTableNames(this.data.tournamentInfo.finalStandingsResolvers)

		// Create tabs for all rounds
		for (let i = 1; i <= (this.data.rounds.length); i++) {
			this.createRoundTab(i);
		}
		
		this.updatePlayersTable()

		// Generate empty cross table
		this.generateCrossTable();
		
		// Update the result values based on the loaded rounds data
		this.updateResultsTab();

		// lock widgets if pairing was generated
		if (this.data.rounds.length) {
			this.lockWidgets()
		}

		// find first empty result
		let r = 0
		let found = false
		for (; r < this.data.rounds.length; r++) {
			if (this.data.rounds[r].some(
				(rowItem) => rowItem.result == "-" || rowItem.result =="")) {
				found =  true
				break;
			}
		}

		if (found) {
			// open round tab with missing result
			this.openTab('tab2')
			this.openRound(r+1);            
		}
		else {
			if (this.data.rounds.length) {
				//set the first round as active
				this.openTab('tab2')
				this.openRound(1);            
			}
			else {
				// pairing has not been generated yet
				this.openTab("tab1")
			}
		}
		this.saveToCookie()
	}

	// ************************************************************
	// Players Tab(le)

	// HTML API
	addPlayerToTable() {
		// Add player & ELO to the table
		let name = document.getElementById("name").value;
		let Elo = document.getElementById("Elo").value;
		if (!Elo) {
			Elo = 1400; // Default Elo value
		}
		if (name && Elo) {
			this.addPlayerToTable_2(name, Elo)
		} else {
			alert("Please enter name.");
		}
	}

	addPlayerToTable_2(name, Elo, batch=false) {
		// check same player name
		if (this.data.players.some((player) => player.name === name)) {
			// skip alert silently if in batch mode
			if (!batch) {
				alert("Player with same name already in tournament");
			}
			return
		}

		let table = document.getElementById("dataTable").getElementsByTagName('tbody')[0];
		let newRow = table.insertRow();
		let nameCell = newRow.insertCell(0);
		let EloCell = newRow.insertCell(1);
		let actionCell = newRow.insertCell(2);

		nameCell.textContent = name;
		EloCell.textContent = Elo;
		actionCell.innerHTML = '<button onclick="app.removePlayer(this)">Remove</button>';

		// Store in variable
		this.data.addPlayer(name, Number(Elo))

		// Clear input fields
		document.getElementById("name").value = "";
		document.getElementById("Elo").value = "";
	}

	removePlayer(button) {
		let row = button.parentNode.parentNode;
		let rowIndex = row.rowIndex - 1; // Adjust for header row
		this.data.removePlayer(rowIndex)
		row.parentNode.removeChild(row); // Remove row from table
	}

	sortPlayers() {
		this.data.sortPlayers() // Sort players by Elo in descending order
		this.updatePlayersTable();
	}

	randomizePlayers() {
		this.data.randomizePlayers();
		this.updatePlayersTable();
	}

	clearPlayersTable() {
		let table = document.getElementById("dataTable").getElementsByTagName('tbody')[0];
		table.innerHTML = ""; // Clear all rows
		this.data.players = []; // Clear players array
	}
	
	updatePlayersTable() {
		let table = document.getElementById("dataTable").getElementsByTagName('tbody')[0];
		table.innerHTML = ""; // Clear existing rows

		this.data.players.forEach(player => {
			let newRow = table.insertRow();

			let nameCell = newRow.insertCell(0);
			let EloCell = newRow.insertCell(1);
			let actionCell = newRow.insertCell(2);

			nameCell.textContent = player.name;
			EloCell.textContent = player.Elo;
			actionCell.innerHTML = '<button onclick="app.removePlayer(this)">Remove</button>';
		});
	}
	
	// ************************************************************
	// Rounds Tab (also Results)
	
	createRoundTab(roundNumber) {
		const roundTabs = document.getElementById("roundTabs");
		const roundContents = document.getElementById("roundContents");

		// Create round tab
		const roundTab = document.createElement("div");
		roundTab.className = "round-tab";
		roundTab.innerText = `Round ${roundNumber}`;
		roundTab.onclick = () => this.openRound(roundNumber); // Use captured round number
		roundTabs.appendChild(roundTab);

		// Create round content
		const roundContent = document.createElement("div");
		roundContent.className = "round-content";
		roundContent.id = `round${roundNumber}`;
		roundContent.innerHTML = `<h3>Round ${roundNumber}</h3>`;
		const table = document.createElement("table");
		
		let html = `
			<thead>
				<tr>
					<th>Player 1</th>
					<th>Player 2</th>
					<th>Result</th>
				</tr>
			</thead>
			<tbody>`

		this.data.rounds[roundNumber - 1].map((pair, index) => {
			let player1Name = this.data.players[pair.player1Idx].name
			let player2Name = this.data.players[pair.player2Idx].name
			html += `
					<tr>
						<td>${player1Name}</td>
						<td>${player2Name}</td>
						<td>
							<select onchange="app.updateResult(${roundNumber - 1}, ${index}, this.value)">
								<option value="-" selected> - </option>
								<option value="1">1-0</option>
								<option value="0">0-1</option>
								<option value="0.5">Draw</option>
								<option value="0-0">0-0</option>
							</select>
						</td>
					</tr>
				`
		});
		html += "</tbody>"
		table.innerHTML = html

		roundContent.appendChild(table);
		roundContents.appendChild(roundContent);
		
		this.openRound(roundNumber);
	}

	updateResult(roundIndex, pairIndex, result) {
		this.data.setResult(roundIndex, pairIndex, result);
		this.updateCrosstable(this.data.rounds[roundIndex][pairIndex]);
	}


	// ************************************************************
	// crosstable
	
	clearCrosstableTab() {
		let table = document.getElementById("crossTable");
		table.innerHTML = ""; // Clear existing rows
	}

	generateCrossTable() {
		let table = document.getElementById("crossTable");

		// Create the header row
		let headerRow = table.insertRow();
		headerRow.insertCell().outerHTML = "<th></th>"; // Empty top-left corner
		this.data.players.forEach(player => {
			let th = document.createElement("th");
			th.textContent = player.name;
			headerRow.appendChild(th);
		});

		// Create rows for players
		this.data.players.forEach((player, rowIndex) => {
			let row = table.insertRow();
			let nameCell = row.insertCell();
			nameCell.textContent = player.name; // Player name in the first column
			nameCell.style.fontWeight = "bold";

			this.data.players.forEach((opponent, colIndex) => {
				let cell = row.insertCell();
				if (rowIndex === colIndex) {
					cell.classList.add("empty"); // Empty cell for self-match
					cell.textContent = "X";
				} else {
					cell.textContent = "-"; // Placeholder for match results
				}
			});
		});
	}

	updateCrosstable(resultRow) {
		let result = resultRow.result

		// two coresponding fields in the table are updated
		let ind1 = resultRow.player1Idx
		let ind2 = resultRow.player2Idx
		let table = document.getElementById("crossTable");
		let cell = table.rows[ind1 + 1].cells[ind2 + 1];
		let reverseCell = table.rows[ind2 + 1].cells[ind1 + 1];

		switch(result) {
			case"-": 
				cell.innerText = "";
				reverseCell.innerText = "";
				break;
			case "1":
			case "0":
			case "0.5":
				cell.innerText = result;
				reverseCell.innerText = invertedResult(result)
				break
			case "0-0":
				cell.innerText = "0";
				reverseCell.innerText = "0";
				break
			default: 
				console.warn("unknown result: '" + result + "'");
		}
	}
	// ************************************************************
	// results
	
	clearResultsTab() {
		const roundTabs = document.getElementById("roundTabs");
		const roundContents = document.getElementById("roundContents");

		// Clear existing round tabs and contents
		roundTabs.innerHTML = "";
		roundContents.innerHTML = "";
	}

	// Update the result values based on the loaded rounds data
	updateResultsTab() {
		this.data.rounds.forEach((round, roundIndex) => {
			round.forEach((pair, pairIndex) => {
				let result = this.data.rounds[roundIndex][pairIndex].result.toString();            
				let selectElement = document.querySelector(`#round${roundIndex + 1} select[onchange="app.updateResult(${roundIndex}, ${pairIndex}, this.value)"]`);
				if (selectElement) {
					selectElement.value = result;
				}
				this.updateCrosstable(this.data.rounds[roundIndex][pairIndex])
			});
		});
	}

	// ************************************************************
	// standings
	
	clearStandingsTab() {
		let table = document.getElementById("standingsTable").getElementsByTagName('tbody')[0];
		table.innerHTML = ""; // Clear existing rows
	}
	
	calculateStandings() {
		let standings = this.data.calculateStandings()

		// Update the standings table
		let table = document.getElementById("standingsTable").getElementsByTagName('tbody')[0];
		table.innerHTML = ""; // Clear existing rows
		for (let i = 0; i < standings.length; i++) {
			let newRow = table.insertRow();
			let numberCell = newRow.insertCell(0);
			let nameCell = newRow.insertCell(1);
			let eloCell = newRow.insertCell(2);
			let pointsCell = newRow.insertCell(3);
			numberCell.textContent = i + 1;
			nameCell.textContent = standings[i].name;
			eloCell.textContent = standings[i].elo;
			pointsCell.textContent = standings[i].points;

			for (let idx = 0; 
				idx < this.data.tournamentInfo.finalStandingsResolvers.length; 
				idx++) {
				let criteriaCell = newRow.insertCell(4+idx);
				criteriaCell.textContent = standings[i].additionalCriteria[idx];
			}
		}
	}

	updateStandingTableNames(criteriaResolvers) {
		// dynamicly adds final standing criteria names to Standing Table
		let table_tr = document.getElementById("standingsTable").getElementsByTagName('tr')[0];

		// first shrink to predefined static names
		while(table_tr.children.length > 4) {
			table_tr.removeChild(table_tr.lastChild)
		}

		criteriaResolvers.forEach(crit => {
			let elem = document.createElement("th")
			table_tr.appendChild(elem).textContent= getCriteriumVisibleName(crit)
		})
	}

	// ************************************************************
	// CSV
	
	exportToCSV() {
		let csvContent = "data:text/csv;charset=utf-8,Name,Elo\n";
		this.data.players.forEach(player => {
			csvContent += `${player.name},${player.Elo}\n`;
		});

		let encodedUri = encodeURI(csvContent);
		let link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", "players.csv");
		document.body.appendChild(link); // Required for FF
		link.click();
		document.body.removeChild(link); // Clean up
	}

	
	// brx: not very useful now, but it should contain all players (even removed)
	// simple case: load all and just remove ones who is not presented
	// after few local tournaments you will have prepared list of local players for quick
	// and simple player list creation
	// TODO: all players list
	importFromCSV(event) {
		const file = event.target.files[0];
		const reader = new FileReader();
		// save instance of class to reader object to some unique variable
		reader.source_app_392483928 = this

		reader.onload = function(e) {
			let app_inst = e.target.source_app_392483928
			const text = e.target.result;
			const rows = text.split('\n').slice(1); // Skip header row
			rows.forEach(row => {
				const [name, Elo] = row.split(',');
				if (name && Elo) {

					app_inst.data.addPlayer(name.trim(), Number(Elo.trim()) );
				}
			});
			app_inst.updatePlayersTable();
		};
		reader.readAsText(file);
	}

	// ************************************************************
	// criteria
	criteriaChanged(target) {
		let opt = target.criteria.selectedIndex
		if (opt>=0  && opt < Tournament.criteriaList.length) {
			this.data.tournamentInfo.finalStandingsResolvers = Tournament.criteriaList[opt]

			this.updateStandingTableNames(this.data.tournamentInfo.finalStandingsResolvers)
		}
	}

	updateCriteriaForm(criterium) {
		Tournament.criteriaList.forEach((item, idx) => {
			if (item.join() === criterium.join()) {
				document.getElementById("criteria").selectedIndex = idx;
			}
		})
	}

	// ************************************************************
	// some test functions

	generateTestResults() {
		const results = ["1", "0.5", "0"];
		//const results = ["1", "0.5", "0", "0-0"];

		this.data.rounds.forEach((round, roundIndex) => {
			round.forEach((pair, pairIndex) => {
				const random = Math.floor(Math.random() * results.length);
				this.data.rounds[roundIndex][pairIndex].result = results[random]
			});
		});
	
		this.updateResultsTab();
	}

	testAll() {
		this.importDemo(true);
		this.randomizePlayers();
		this.lockAndPairing();

		this.generateTestResults();
		this.saveToCookie()

		this.openTab('tab3');
	}

	async sendFeedback() {
		const feedback_text = sanitizeInput(document.getElementById("feedback").value);
		const myHeaders = new Headers();
    	myHeaders.append("Content-Type", "application/json");		
    	const raw = JSON.stringify({
    	  "message": feedback_text
    	});
	
    	const requestOptions = {
    	  method: "POST",
    	  headers: myHeaders,
    	  body: raw,
    	  redirect: "follow"
    	};
	
    	fetch("https://p11gt3fasc.execute-api.eu-central-1.amazonaws.com/default/Handle_CP_feddback", requestOptions)
    	  .then((response) => response.text())
    	  .then((result) => console.log(result))
    	  .catch((error) => console.error(error));
		
		document.getElementById("feedback").value = "Thank You.";
	}
}

function sanitizeInput(input) {
    return input.replace(/[^a-zA-Z0-9À-ž .,:;!?'\n\r\[\](){}-]/g, '');
}

window.Controller = Controller
window.Tournament = Tournament


