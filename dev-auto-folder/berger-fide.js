function generateBergerPairingsIdx(size) {
    let pairing = [];
    const n = size;
    const rounds = n - 1;
    let c = 1;

    // Left player
    for (let i = 0; i < rounds; i++) { // Iterating through the rounds
        pairing.push([]); // Appending a new round
        for (let j = 0; j < Math.floor(n / 2); j++) { // Iterating through the tables (pairs of players)
            if (c === n) { // If c already is equal to n, then reset counter c to 1
                c = 1;
            }
            pairing[pairing.length - 1].push([c - 1, 0]); // Add to the last list
            c += 1;
        }
    }

    // Right player
    for (let i = 0; i < rounds; i++) { // Iterating through the rounds
        for (let j = 0, c = Math.floor(n / 2) - 1; c >= 0; j++, c--) { // Iterating backward through the tables (pairs of players)
            if (i === rounds - 1) {
                pairing[i][j][1] = pairing[0][c][0];
            } else {
                pairing[i][j][1] = pairing[i + 1][c][0];
            }
        }
    }

    // Tune first row
    for (let i = 0; i < rounds; i++) { // Iterating through the rounds
        if (i % 2 === 0) { // If i is even
            pairing[i][0][1] = n - 1;
        } else {
            pairing[i][0][0] = n - 1;
        }
    }
    return pairing;
}

function generateBergerPairings(players) {
    let pairing = [];

	let generated = generateBergerPairingsIdx(players.length)

    //replace idx with players (generates new structure)
    for (let round = 0; round < generated.length; round++) { // Iterating through the rounds
        pairing.push([]); // Appending a new round
		for (let pairRow = 0; pairRow < generated[round].length; pairRow++) {
			let pair = generated[round][pairRow]

            pairing[pairing.length - 1].push([players[pair[0]], players[pair[1]]]); 
        }
    }

	return pairing

}
