
def berger(players):
    pairing = []
    n = len(players)
    c = 1

    # left player
    for i in range(n - 1): #iterating through the rounds
        pairing.append([])  #appending a new round
        for j in range(n//2): #iterating through the tables (pairs of players)
            if c == n: #if c already is equal to n, then reset counter c to 1
                c = 1
            pairing[-1].append([players[c - 1], 0]) #do posledneho listu
            c += 1

    # right player
    for i in range(n - 1): #iterating through the rounds
        for j, c in enumerate(range(n//2-1, -1, -1)): #iterating backward through the tables (pairs of players)
            if i == n - 2:
                pairing[i][j][1] = pairing[0][c][0]
            else:
                pairing[i][j][1] = pairing[i+1][c][0]

    # tune first row
    for i in range(n - 1): #iterating through the rounds
        if i % 2 == 0: #if i is even
            pairing[i][0][1] = players[n-1]
        else:
            pairing[i][0][0] = players[n-1]
    return(pairing)

#------------------------------------------------------------
players_list = [{'name': '1', 'elo': 1400}, {'name': '2', 'elo': 1300}, {'3': 'juraj', 'elo': 1600}, {'4': 'alena', 'elo': 1700}]

pairing = berger(players_list)
for i in pairing:
    print(i)

