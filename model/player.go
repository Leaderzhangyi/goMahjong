package model

import (
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// Player 表示麻将游戏中的一个玩家
type Player struct {
	ID    string          `json:"id"`
	Name  string          `json:"name"`
	Conn  *websocket.Conn `json:"-"`
	Tiles []string        `json:"tiles,omitempty"` // 玩家手牌
	Score int             `json:"score"`           // 玩家分数
}

// NewPlayer 创建一个新玩家
func NewPlayer(name string) *Player {
	return &Player{
		ID:    uuid.New().String(),
		Name:  name,
		Tiles: make([]string, 0),
		Score: 0,
	}
}

// GetPublicInfo 获取玩家公开信息
func (p *Player) GetPublicInfo() map[string]interface{} {
	return map[string]interface{}{
		"id":    p.ID,
		"name":  p.Name,
		"score": p.Score,
	}
}

// SendMessage 向玩家发送消息
func (p *Player) SendMessage(message Message) error {
	if p.Conn == nil {
		return nil
	}
	return p.Conn.WriteJSON(message)
}
