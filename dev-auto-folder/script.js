import {
	Tournament,
	getCriteriumVisibleName,
	invertedResult,
} from "./tournament.js";

export class Controller {
	constructor(tournament_data) {
		this.data = tournament_data
	}

	async initialize() {
		const savedDataStatus = this.data.getSavedDataStatus();
		if (savedDataStatus.isStale) {
			const shouldResume = await this.promptResumeSavedTournament(
				savedDataStatus.savedAt
			);

			if (shouldResume) {
				this.data.loadData();
			} else {
				this.data.clearSavedData();
			}
		} else if (savedDataStatus.hasSavedData) {
			this.data.loadData();
		}

		this.applyAllData(this.data)
	}

	formatSavedTournamentDate(savedAt) {
		if (!savedAt) {
			return "an unknown date";
		}

		return new Intl.DateTimeFormat(undefined, {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}).format(new Date(savedAt));
	}

	async promptResumeSavedTournament(savedAt) {
		const savedAtLabel = this.formatSavedTournamentDate(savedAt);
		const result = await Swal.fire({
			title: "Old saved tournament found",
			html: `Found a saved tournament from <strong>${savedAtLabel}</strong>. Do you want to resume it?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#d4a15b",
			cancelButtonColor: "#f87d7dff",
			confirmButtonText: "Resume",
			cancelButtonText: "Discard",
			reverseButtons: true,
			allowOutsideClick: false,
		});

		return result.isConfirmed;
	}

	//newTournament(confirmed = false) {
	//	if (!confirmed) {
	//		if (!confirm("THIS WILL DELETE ALL CURRENT DATA,\nPROCEED ?")) {
	//			return
	//		}
	//	}
	//	this.clearAll()
	//}
	newTournament(confirmed = false) {
    if (!confirmed) {
        Swal.fire({
            title: "Delete All Data?",
            text: "This will delete all curent tournament data. Do you want to proceed?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#f87d7dff",
            cancelButtonColor: "#d4a15b",
            confirmButtonText: "Yes, delete",
            cancelButtonText: "Cancel"
        }).then((result) => {
            if (result.isConfirmed) {
                this.clearAll();
            }
        });
        return;
    }
    this.clearAll();
}

	clearAll() {
		// --- Save settings before clearing ---
    	const savedCriteria = this.data.tournamentInfo.finalStandingsResolvers;

		// clear all Tournament data
		this.data = new Tournament()
		this.clearPlayersTable()
		this.clearResultsTab()
		this.clearCrosstableTab()
		this.clearStandingsTab()
		this.updateStandingTableNames([])
		this.unlockWidgets()
		this.openTab('tab1')

		
		// --- Restore settings after clearing ---
		this.data.tournamentInfo.finalStandingsResolvers = savedCriteria;
		this.updateCriteriaForm(this.data.tournamentInfo.finalStandingsResolvers);
		
		this.data.saveData()
	}

	unlockWidgets() {
		document.getElementById("name").disabled = false;
		document.getElementById("Elo").disabled = false;

		// Enable buttons
		document.querySelectorAll('#tab1 .button-container button').forEach(button => {
			button.disabled = false;
		});

		// Enable AddPlayer button
		document.getElementById("AddPlayer").disabled = false;
		
		// Optionally, add a visual indication that the table is locked
		document.getElementById("dataTable").classList.remove('locked');
		document.getElementById("criteriaButton").disabled = false;
	}

	lockWidgets() {
		// Disable input fields
		document.getElementById("name").disabled = true;
		document.getElementById("Elo").disabled = true;

		// Disable buttons
		document.querySelectorAll('#tab1 .button-container button').forEach(button => {
			button.disabled = true;
		});

		// Dissble AddPlayer button
		document.getElementById("AddPlayer").disabled = true;
		
		// Optionally, add a visual indication that the table is locked
		document.getElementById("dataTable").classList.add('locked');
		document.getElementById("criteriaButton").disabled = true;
	}

	extraCycle() {
		this.data.extraCycle()
		// add extra round tabs
		let c = this.data.rounds.length - this.data.rounds.length / this.data.tournamentInfo.numCycles + 1
		for (let i = c; i <= (this.data.rounds.length); i++) {
			this.createRoundTab(i);
		}
		this.openRound(c);
		this.data.saveData()
		this.buttonFeedback("extracycle");
	}

	lockAndPairing() {
		if (this.data.players.length < 2) {
			// alert("Not enough players")
			Swal.fire({
			  title: "Error",
			  text: "Not enough players",
			  icon: "error",
			  confirmButtonColor: "#d4a15b"
			});
			return
		}
		this.buttonFeedback("pairing");

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
		this.openTab('tab3')
		this.openTab('tab2')
		// Make round 1 active tab
		this.openRound(1);
		this.data.saveData()
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
			this.addPlayerToTableExecute(player.name, player.Elo, true);
		})
		
		this.updatePlayersTable();
	}

	generatePairings(method) {
		this.data.generatePairings(method)
	}

	applyAllData(data_loaded) {
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
	}

	// ************************************************************
	// Players Tab(le)

	// HTML API
	addPlayerToTable() {
		// Add player & ELO to the table controller
		let name = document.getElementById("name").value;
		let Elo = document.getElementById("Elo").value;
		if (!Elo) {
			Elo = 1400; // Default Elo value
		}
		if (name && Elo) {
			this.addPlayerToTableExecute(name, Elo)
		} else {
			// alert("Please enter name.");
			Swal.fire({
			  title: "Error",
			  text: "Please enter name",
			  icon: "error",
			  confirmButtonColor: "#d4a15b"
			});
		}
	}

	addPlayerToTableExecute(name, Elo, batch=false) {
		// check same player name
		if (this.data.players.some((player) => player.name === name)) {
			// skip alert silently if in batch mode
			if (!batch) {
				// alert("Player with same name already in tournament");
				Swal.fire({
				  title: "Error",
				  text: "Player with same name already in tournament",
				  icon: "error",
				  confirmButtonColor: "#d4a15b"
				});	
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
		actionCell.innerHTML = '<button class="remove-button" onclick="app.removePlayer(this)">Remove</button>';

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
		this.data.saveData()
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
			actionCell.innerHTML = '<button class="remove-button" onclick="app.removePlayer(this)">Remove</button>';
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
							<select class="result-select" onchange="app.updateResult(${roundNumber - 1}, ${index}, this.value)">
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
		this.updateCrosstable();
	}
	
	clearCrosstableTab() {
		let table = document.getElementById("crossTable");
		table.innerHTML = ""; // Clear existing rows
	}

	generateCrossTable() {
		let table = document.getElementById("crossTable");
		table.innerHTML = ""; // Always clear first
		// Only generate if there are players
    	if (!this.data.players || this.data.players.length === 0) {
    	    return;
    	}

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

	// need to rewrite to use data not just current result
	updateCrosstable() {
	    let table = document.getElementById("crossTable");
	    // Clear all cells except headers and player names
	    for (let i = 1; i < table.rows.length; i++) {
	        for (let j = 1; j < table.rows[i].cells.length; j++) {
	            table.rows[i].cells[j].innerText = "";
	        }
	    }
		// Make "X" in diagonal again (in case of clear)
		for (let i = 1; i < table.rows.length; i++) {
			if (table.rows[i].cells[i]) {
        		table.rows[i].cells[i].innerText = "X";
    		}
		}
	
	    // Aggregate results for each player pair
	    for (let round of this.data.rounds) {
	        for (let resultRow of round) {
	            let ind1 = resultRow.player1Idx;
	            let ind2 = resultRow.player2Idx;
	            let result = resultRow.result;
			
	            // Skip empty or placeholder results
	            if (result === "-" || result === "") continue;
			
	            let cell = table.rows[ind1 + 1].cells[ind2 + 1];
	            let reverseCell = table.rows[ind2 + 1].cells[ind1 + 1];
			
	            // If there are multiple rounds, concatenate results (or you can sum points, etc.)
	            if (cell.innerText) {
	                cell.innerText += " / " + result;
	                reverseCell.innerText += " / " + invertedResult(result);
	            } else {
	                if (result === "0-0") {
	                    cell.innerText = "0";
	                    reverseCell.innerText = "0";
	                } else {
	                    cell.innerText = result;
	                    reverseCell.innerText = invertedResult(result);
	                }
	            }
	        }
	    }
	}
	
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
				this.updateCrosstable()
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
			let performanceCell = newRow.insertCell(4);
			numberCell.textContent = i + 1;
			nameCell.textContent = standings[i].name;
			eloCell.textContent = standings[i].elo;
			pointsCell.textContent = standings[i].points;
			performanceCell.textContent = standings[i].performance ?? "-";

			for (let idx = 0; 
				idx < this.data.tournamentInfo.finalStandingsResolvers.length; 
				idx++) {
				let criteriaCell = newRow.insertCell(5 + idx);
				criteriaCell.textContent = standings[i].additionalCriteria[idx];
			}
		}
	}

	updateStandingTableNames(criteriaResolvers) {
		// dynamicly adds final standing criteria names to Standing Table
		let table_tr = document.getElementById("standingsTable").getElementsByTagName('tr')[0];

		// first shrink to predefined static names
		while(table_tr.children.length > 5) {
			table_tr.removeChild(table_tr.lastChild)
		}

		criteriaResolvers.forEach(crit => {
			let elem = document.createElement("th")
			table_tr.appendChild(elem).textContent= getCriteriumVisibleName(crit)
		})
	}

	// ************************************************************
	// Browser-local player groups
	
	savePlayersPopup() {
		Swal.fire({
			title: "Save Players",
			html: `
				<div style="text-align: left;">
					<label for="groupName" style="display: block; margin-bottom: 10px;">Group Name (optional):</label>
					<input type="text" id="groupName" placeholder="e.g., Tournament 202" style="width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px;">
				</div>
			`,
			icon: "info",
			showCancelButton: true,
			confirmButtonColor: "#d4a15b",
			cancelButtonColor: "#888",
			confirmButtonText: "Save",
			didOpen: () => {
				document.getElementById("groupName").focus();
			}
			}).then((result) => {
				const groupName = document.getElementById("groupName").value || "players";
				if (result.isConfirmed){
					this.savePlayersLocally(groupName);
				}
			});
		}

	savePlayersLocally(groupName) {
		const playerGroups = JSON.parse(localStorage.getItem('playerGroups')) || {};
		playerGroups[groupName] = {
			timestamp: Date.now(),
			players: this.data.players
		};
		localStorage.setItem('playerGroups', JSON.stringify(playerGroups));
		
		Swal.fire({
			title: "Saved!",
			text: `Player group "${groupName}" saved locally`,
			icon: "success",
			confirmButtonColor: "#d4a15b"
		});
	}

	importPlayersPopup() {
		const playerGroups = JSON.parse(localStorage.getItem('playerGroups')) || {};
		const savedGroups = Object.keys(playerGroups);
		
		let htmlContent = `
			<div style="text-align: left;">
				<div style="margin-bottom: 15px;">
				</div>
		`;
		
		if (savedGroups.length > 0) {
			htmlContent += `
				<div style="margin-bottom: 15px;">
					<label style="display: block; margin-bottom: 10px; font-weight: bold;">Saved Groups:</label>
					<select id="savedGroupSelect" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
						<option value="">-- Select a group --</option>
			`;
			
			savedGroups.forEach(group => {
				htmlContent += `<option value="${group}">${group}</option>`;
			});
			
			htmlContent += `
					</select>
				</div>
			`;
		} else {
			htmlContent += `
				<div style="padding: 10px; background-color: #f0f0f0; border-radius: 4px; margin-bottom: 15px;">
					<p style="margin: 0; color: #666;">No saved player groups yet.</p>
				</div>
			`;
		}
		
		htmlContent += `</div>`;
		
		Swal.fire({
			title: "Load Players",
			html: htmlContent,
			icon: "info",
			showCancelButton: true,
			showConfirmButton: savedGroups.length > 0,
			confirmButtonColor: "#d4a15b",
			cancelButtonColor: "#888",
			confirmButtonText: "Load",
			cancelButtonText: "Cancel",
			allowOutsideClick: false
		}).then((result) => {
			if (result.isConfirmed) {
				const selectElement = document.getElementById('savedGroupSelect');
				const selectedGroup = selectElement?.value;
				
				if (selectedGroup && playerGroups[selectedGroup]) {
					this.loadPlayersFromBrowser(selectedGroup, playerGroups[selectedGroup].players);
				} else {
					Swal.fire({
						title: "Error",
						text: "Please select a player group",
						icon: "error",
						confirmButtonColor: "#d4a15b"
					});
				}
			}
		});
	}

	loadPlayersFromBrowser(groupName, players) {
		players.forEach(player => {
			if (!this.data.players.some((p) => p.name === player.name)) {
				this.addPlayerToTableExecute(player.name, player.Elo, true);
			}
		});
		this.updatePlayersTable();
		
		Swal.fire({
			title: "Loaded!",
			text: `Player group "${groupName}" loaded with ${players.length} players`,
			icon: "success",
			confirmButtonColor: "#d4a15b"
		});
	}

	updateCriteriaForm(criterium) {
		const criteriaValue = document.getElementById("criteriaValue");
		if (criteriaValue) {
			criteriaValue.textContent = this.getCriteriaOptionLabel(criterium);
		}
	}

	getCriteriaOptionLabel(criterium) {
		if (!criterium || criterium.length === 0) {
			return "Total points only";
		}

		return criterium.map(getCriteriumVisibleName).join(", ");
	}

	openCriteriaPopup() {
		const currentCriteria = this.data.tournamentInfo.finalStandingsResolvers;
		const totalOptions = Tournament.criteriaList.length;
		let selectedIdx = 0;

		Tournament.criteriaList.forEach((item, idx) => {
			if (item.join() === currentCriteria.join()) {
				selectedIdx = idx;
			}
		});

		Swal.fire({
			title: "Final standings criteria",
			html: `
				<div id="criteriaPicker" style="display: grid; gap: 14px; margin-top: 6px;">
					<div style="display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; gap: 10px;">
						<button type="button" id="criteriaPrev" style="height: 44px; border: none; border-radius: 999px; background: #efe4d0; color: #6d4c23; font-size: 28px; cursor: pointer;">&#8249;</button>
						<div style="display: grid; gap: 8px;">
							<div id="criteriaPreviewPrev" style="padding: 10px 12px; border-radius: 14px; background: #f7f1e7; color: #9b8a72; font-size: 13px; transform: scale(0.95); opacity: 0.75;"></div>
							<div id="criteriaPreviewCurrent" style="padding: 16px 14px; border-radius: 18px; background: linear-gradient(180deg, #f7e9cd 0%, #ecd29f 100%); color: #5b3c15; font-weight: 700; box-shadow: 0 10px 24px rgba(120, 80, 20, 0.16);"></div>
							<div id="criteriaPreviewNext" style="padding: 10px 12px; border-radius: 14px; background: #f7f1e7; color: #9b8a72; font-size: 13px; transform: scale(0.95); opacity: 0.75;"></div>
						</div>
						<button type="button" id="criteriaNext" style="height: 44px; border: none; border-radius: 999px; background: #efe4d0; color: #6d4c23; font-size: 28px; cursor: pointer;">&#8250;</button>
					</div>
					<div id="criteriaMeta" style="font-size: 13px; color: #6d6356; line-height: 1.5;"></div>
					<div id="criteriaDots" style="display: flex; justify-content: center; gap: 8px;"></div>
				</div>
			`,
			showCancelButton: true,
			confirmButtonColor: "#d4a15b",
			cancelButtonColor: "#888",
			confirmButtonText: "Save",
			cancelButtonText: "Cancel",
			focusConfirm: false,
			didOpen: () => {
				const popup = Swal.getPopup();
				const prevButton = popup.querySelector("#criteriaPrev");
				const nextButton = popup.querySelector("#criteriaNext");
				const prevPreview = popup.querySelector("#criteriaPreviewPrev");
				const currentPreview = popup.querySelector("#criteriaPreviewCurrent");
				const nextPreview = popup.querySelector("#criteriaPreviewNext");
				const meta = popup.querySelector("#criteriaMeta");
				const dots = popup.querySelector("#criteriaDots");

				const getWrappedIndex = (idx) => (idx + totalOptions) % totalOptions;
				const getCriteriaMeta = (idx) => {
					const criteria = Tournament.criteriaList[idx];
					if (criteria.length === 0) {
						return "Only total points decide the final standing.";
					}
					return `Priority order: ${criteria.map((crit, order) => `${order + 1}. ${getCriteriumVisibleName(crit)}`).join("  |  ")}`;
				};

				const renderDots = () => {
					dots.innerHTML = "";
					for (let idx = 0; idx < totalOptions; idx++) {
						const dot = document.createElement("span");
						dot.style.width = "9px";
						dot.style.height = "9px";
						dot.style.borderRadius = "999px";
						dot.style.background = idx === selectedIdx ? "#c9913d" : "#e6d8be";
						dot.style.transition = "all 140ms ease";
						dots.appendChild(dot);
					}
				};

				const renderPicker = () => {
					prevPreview.textContent = this.getCriteriaOptionLabel(
						Tournament.criteriaList[getWrappedIndex(selectedIdx - 1)]
					);
					currentPreview.textContent = this.getCriteriaOptionLabel(
						Tournament.criteriaList[selectedIdx]
					);
					nextPreview.textContent = this.getCriteriaOptionLabel(
						Tournament.criteriaList[getWrappedIndex(selectedIdx + 1)]
					);
					meta.textContent = getCriteriaMeta(selectedIdx);
					renderDots();
				};

				prevButton.addEventListener("click", () => {
					selectedIdx = getWrappedIndex(selectedIdx - 1);
					renderPicker();
				});

				nextButton.addEventListener("click", () => {
					selectedIdx = getWrappedIndex(selectedIdx + 1);
					renderPicker();
				});

				renderPicker();
			},
			preConfirm: () => {
				if (selectedIdx < 0 || selectedIdx >= totalOptions) {
					Swal.showValidationMessage("Please select criteria");
					return false;
				}
				return String(selectedIdx);
			}
		}).then((result) => {
			if (!result.isConfirmed) {
				return;
			}

			const opt = Number(result.value);
			this.data.tournamentInfo.finalStandingsResolvers = Tournament.criteriaList[opt];
			this.updateStandingTableNames(this.data.tournamentInfo.finalStandingsResolvers);
			this.updateCriteriaForm(this.data.tournamentInfo.finalStandingsResolvers);
			this.data.saveData();
		});
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
		this.data.loadData()

		this.importDemo(true);
		this.randomizePlayers();
		this.lockAndPairing();

		this.generateTestResults();
		this.data.saveData()

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

	buttonFeedback(button) {
		console.log(button)
		// skip sending feedback for demo players
		if (["Magnus", "Fabiano", "Hikaru", "Arjun", "Gukesh", "Nodirbek", "Alireza", "Yi", "Ian", "Anand", "test"].includes(this.data.players[0].name)) {
  			return;
		}
		let feedback_text = "";
		if (button == "pairing") {
			feedback_text = "Pairing...Timezone: " + this.timezone + ", Device type: " + this.deviceType + ", Total players: " + this.data.players.length + ", Cycles: " + this.data.tournamentInfo.numCycles;
		}
		if (button == "extracycle") {			
			feedback_text = "ExctraCycle...Timezone: " + this.timezone + ", Device type: " + this.deviceType + ", Total players: " + this.data.players.length + ", Cycles: " + this.data.tournamentInfo.numCycles;
		}
		if (!feedback_text) return;
		console.log(feedback_text)
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

	}
}

function sanitizeInput(input) {
    return input.replace(/[^a-zA-Z0-9À-ž .,:;!?'\n\r\[\](){}-]/g, '');
}

if (typeof window !== 'undefined') {
	window.Controller = Controller
	window.Tournament = Tournament
}

// Event listeners:
document.addEventListener("DOMContentLoaded", () => {
    // Get visitor timezone
    let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	timezone = timezone.replace(/\//g, "-");

    // Detect device type
    let deviceType = "Desktop";
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      deviceType = "Mobile";
    } else if (/Tablet|iPad/i.test(navigator.userAgent)) {
      deviceType = "Tablet";
    }

	// Initialize app - browser refresh
    window.app = new Controller(new Tournament());
	app.timezone = timezone;
    app.deviceType = deviceType;
    app.initialize();



	// Players Tab - buttons	
    const addBtn = document.getElementById('AddPlayer');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            app.addPlayerToTable();
        });
    }

	//Pairing Tab
	const extraCycle = document.getElementById('extraCycle');
	if (extraCycle) {
		extraCycle.addEventListener('click', () => {
			app.extraCycle();
		});
	}

	// Settings Tab

	const criteriaButton = document.getElementById('criteriaButton');
	if (criteriaButton) {
		criteriaButton.addEventListener('click', () => {
			app.openCriteriaPopup();
		});
	}
});
