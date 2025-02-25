package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// IndexHandler 处理首页请求
func IndexHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "index.html", gin.H{
		"title": "四川麻将-首页🀄",
	})
}

// RoomHandler 处理房间页面请求
func RoomHandler(c *gin.Context) {
	roomID := c.Param("roomID")
	c.HTML(http.StatusOK, "room.html", gin.H{
		"title":  "四川麻将-房间🀄",
		"roomID": roomID,
	})
}

// CreateRoomHandler 处理创建房间页面请求
func CreateRoomHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "create_room.html", gin.H{
		"title": "四川麻将-创建房间🀄",
	})
}

// JoinRoomHandler 处理加入房间页面请求
func JoinRoomHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "join_room.html", gin.H{
		"title": "四川麻将-加入房间🀄",
	})
}
