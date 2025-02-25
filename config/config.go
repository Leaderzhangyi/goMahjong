package config

import (
	"fmt"
	"log"
	"sync"

	"github.com/spf13/viper"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

const (
	env = "dev"
)

var (
	zap_singleton *zap.Logger
	zap_once      sync.Once
)

func GetEnv() string {
	return env
}

func GetZapLogger() *zap.Logger {
	zap_once.Do(func() {
		config := zap.NewDevelopmentConfig()
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder // 彩色日志级别
		config.Level = zap.NewAtomicLevelAt(zapcore.DebugLevel)             // 设置最低日志级别
		config.DisableStacktrace = true                                     // 禁用堆栈追踪
		config.Encoding = "console"                                         // 控制台输出
		config.OutputPaths = []string{"stdout"}                             // 确保输出到控制台
		config.Development = true                                           // 开发模式
		var err error
		zap_singleton, err = config.Build()
		if err != nil {
			panic(err)
		}
	})
	return zap_singleton
}

func Init() {

	env := "dev"
	viper.AddConfigPath("./config")
	viper.AddConfigPath(".")
	viper.SetConfigName(fmt.Sprintf("config.%s", env))
	viper.SetConfigType("yaml")
	err := viper.ReadInConfig()
	if err != nil {
		log.Fatal("can not find config file")
		panic(err)
	}

}
