package model

import (
	"goMahjong/config"
	"math/rand"
	"time"

	"github.com/google/uuid"
)

// GameState 游戏状态
type GameState string

const (
	GameStateWaiting  GameState = "waiting"  // 等待开始
	GameStatePlaying  GameState = "playing"  // 游戏中
	GameStateFinished GameState = "finished" // 游戏结束
)

// Room 表示一个麻将房间
type Room struct {
	ID                 string    `json:"id"`
	Password           string    `json:"-"`
	Players            []*Player `json:"players"`
	Owner              *Player   `json:"owner"`
	GameState          GameState `json:"gameState"`
	Tiles              []string  `json:"-"`                  // 牌堆
	DiscardedTiles     []string  `json:"discardedTiles"`     // 弃牌堆
	CurrentPlayerIndex int       `json:"currentPlayerIndex"` // 当前玩家索引
	LastPlayedTile     string    `json:"lastPlayedTile"`     // 最后打出的牌
}

// NewRoom 创建一个新房间
func NewRoom(password string) *Room {
	return &Room{
		ID:             uuid.New().String()[:6], // 生成6位房间号
		Password:       password,
		Players:        make([]*Player, 0),
		GameState:      GameStateWaiting,
		DiscardedTiles: make([]string, 0),
	}
}

// AddPlayer 添加玩家到房间
func (r *Room) AddPlayer(player *Player) {
	r.Players = append(r.Players, player)
}

// RemovePlayer 从房间移除玩家
func (r *Room) RemovePlayer(playerID string) {
	for i, p := range r.Players {
		if p.ID == playerID {
			r.Players = append(r.Players[:i], r.Players[i+1:]...)
			break
		}
	}
}

// GetPlayer 根据ID获取玩家
func (r *Room) GetPlayer(playerID string) *Player {
	for _, p := range r.Players {
		if p.ID == playerID {
			return p
		}
	}
	return nil
}

// SetOwner 设置房主
func (r *Room) SetOwner(player *Player) {
	r.Owner = player
}

// GetRoomInfo 获取房间信息
func (r *Room) GetRoomInfo() map[string]interface{} {
	players := make([]map[string]interface{}, 0)
	for _, p := range r.Players {
		players = append(players, p.GetPublicInfo())
	}

	return map[string]interface{}{
		"id":        r.ID,
		"players":   players,
		"owner":     r.Owner.GetPublicInfo(),
		"gameState": r.GameState,
	}
}

// BroadcastAll 向房间内所有玩家广播消息
func (r *Room) BroadcastAll(message Message) {
	for _, p := range r.Players {
		p.SendMessage(message)
	}
}

// BroadcastExcept 向除了指定玩家外的所有玩家广播消息
func (r *Room) BroadcastExcept(message Message, exceptPlayerID string) {
	for _, p := range r.Players {
		if p.ID != exceptPlayerID {
			p.SendMessage(message)
		}
	}
}

// StartGame 开始游戏
func (r *Room) StartGame() {
	logger := config.GetZapLogger()
	logger.Info("游戏开始，房间ID: " + r.ID)

	r.GameState = GameStatePlaying
	r.DiscardedTiles = make([]string, 0)

	// 初始化麻将牌
	r.initTiles()

	// 洗牌
	r.shuffleTiles()

	// 发牌
	r.dealTiles()

	// 随机选择第一个玩家
	r.CurrentPlayerIndex = rand.Intn(len(r.Players))

	// 通知每个玩家他们的手牌
	for _, p := range r.Players {
		p.SendMessage(Message{
			Type: "your_tiles",
			Data: map[string]interface{}{
				"tiles": p.Tiles,
			},
		})
	}
}

// 初始化麻将牌
func (r *Room) initTiles() {
	// 简化版：使用数字1-9和字母表示不同的牌
	tileTypes := []string{
		// 条子
		"1t", "2t", "3t", "4t", "5t", "6t", "7t", "8t", "9t",
		// 筒子
		"1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p",
		// 万子
		"1w", "2w", "3w", "4w", "5w", "6w", "7w", "8w", "9w",
		// 风牌：东南西北
		"east", "south", "west", "north",
		// 箭牌：中发白
		"red", "green", "white",
	}

	r.Tiles = make([]string, 0)

	// 每种牌4张
	for _, t := range tileTypes {
		for i := 0; i < 4; i++ {
			r.Tiles = append(r.Tiles, t)
		}
	}
}

// 洗牌
func (r *Room) shuffleTiles() {
	rand.Seed(time.Now().UnixNano())
	rand.Shuffle(len(r.Tiles), func(i, j int) {
		r.Tiles[i], r.Tiles[j] = r.Tiles[j], r.Tiles[i]
	})
}

// 发牌
func (r *Room) dealTiles() {
	// 每个玩家13张牌
	for _, p := range r.Players {
		p.Tiles = make([]string, 0)
		for i := 0; i < 13; i++ {
			if len(r.Tiles) > 0 {
				p.Tiles = append(p.Tiles, r.Tiles[0])
				r.Tiles = r.Tiles[1:]
			}
		}
	}

	// 给当前玩家额外发一张牌
	if len(r.Tiles) > 0 {
		r.Players[r.CurrentPlayerIndex].Tiles = append(
			r.Players[r.CurrentPlayerIndex].Tiles,
			r.Tiles[0],
		)
		r.Tiles = r.Tiles[1:]
	}
}

// GetGameState 获取游戏状态
func (r *Room) GetGameState() map[string]interface{} {
	playerInfos := make([]map[string]interface{}, 0)
	for _, p := range r.Players {
		playerInfos = append(playerInfos, map[string]interface{}{
			"id":        p.ID,
			"name":      p.Name,
			"score":     p.Score,
			"tileCount": len(p.Tiles),
		})
	}

	return map[string]interface{}{
		"gameState":          r.GameState,
		"players":            playerInfos,
		"currentPlayerIndex": r.CurrentPlayerIndex,
		"currentPlayerID":    r.Players[r.CurrentPlayerIndex].ID,
		"discardedTiles":     r.DiscardedTiles,
		"remainingTiles":     len(r.Tiles),
	}
}

// HandlePlayTile 处理玩家出牌
func (r *Room) HandlePlayTile(playerID string, tile string) {
	logger := config.GetZapLogger()

	// 检查是否是当前玩家的回合
	if r.Players[r.CurrentPlayerIndex].ID != playerID {
		return
	}

	player := r.GetPlayer(playerID)
	if player == nil {
		return
	}

	// 检查玩家是否有这张牌
	tileIndex := -1
	for i, t := range player.Tiles {
		if t == tile {
			tileIndex = i
			break
		}
	}

	if tileIndex == -1 {
		return
	}

	// 从玩家手牌中移除这张牌
	player.Tiles = append(player.Tiles[:tileIndex], player.Tiles[tileIndex+1:]...)

	// 添加到弃牌堆
	r.DiscardedTiles = append(r.DiscardedTiles, tile)
	r.LastPlayedTile = tile

	logger.Info("玩家 " + player.Name + " 打出了 " + tile)

	// 广播出牌信息
	r.BroadcastAll(Message{
		Type: "tile_played",
		Data: map[string]interface{}{
			"playerID": playerID,
			"tile":     tile,
		},
	})

	// TODO: 检查其他玩家是否可以吃碰杠胡

	// 轮到下一个玩家
	r.nextPlayer()
}

// 轮到下一个玩家
func (r *Room) nextPlayer() {
	r.CurrentPlayerIndex = (r.CurrentPlayerIndex + 1) % len(r.Players)

	// 给下一个玩家发一张牌
	if len(r.Tiles) > 0 {
		newTile := r.Tiles[0]
		r.Tiles = r.Tiles[1:]
		r.Players[r.CurrentPlayerIndex].Tiles = append(r.Players[r.CurrentPlayerIndex].Tiles, newTile)

		// 通知玩家新抽到的牌
		r.Players[r.CurrentPlayerIndex].SendMessage(Message{
			Type: "new_tile",
			Data: map[string]interface{}{
				"tile": newTile,
			},
		})
	}

	// 通知所有玩家轮到谁了
	r.BroadcastAll(Message{
		Type: "turn_changed",
		Data: map[string]interface{}{
			"playerID": r.Players[r.CurrentPlayerIndex].ID,
		},
	})
}

// HandlePlayerAction 处理玩家动作（吃、碰、杠、胡）
func (r *Room) HandlePlayerAction(playerID string, actionType string, tiles []interface{}) {
	// 简化版实现，实际麻将规则更复杂
	logger := config.GetZapLogger()
	logger.Info("玩家 " + playerID + " 执行动作: " + actionType)

	// TODO: 实现吃碰杠胡的逻辑
}
