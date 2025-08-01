import { images } from "@/constants/images";
import React, { memo, useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Image, Text, View } from "react-native";

const LoadingDots = memo(() => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const createAnimation = (animatedValue: Animated.Value, delay: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(animatedValue, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(animatedValue, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ])
            );
        };

        const animation1 = createAnimation(dot1, 0);
        const animation2 = createAnimation(dot2, 200);
        const animation3 = createAnimation(dot3, 400);

        animation1.start();
        animation2.start();
        animation3.start();

        return () => {
            animation1.stop();
            animation2.stop();
            animation3.stop();
        };
    }, [dot1, dot2, dot3]);

    return (
        <View className="flex-row items-center justify-center mt-2 space-x-1">
            <Animated.View 
                style={{
                    opacity: dot1,
                    transform: [{ scale: dot1 }]
                }}
                className="w-2 h-2 bg-accent rounded-full"
            />
            <Animated.View 
                style={{
                    opacity: dot2,
                    transform: [{ scale: dot2 }]
                }}
                className="w-2 h-2 bg-accent rounded-full"
            />
            <Animated.View 
                style={{
                    opacity: dot3,
                    transform: [{ scale: dot3 }]
                }}
                className="w-2 h-2 bg-accent rounded-full"
            />
        </View>
    );
});

const Loading: React.FC<LoadingProps> = memo(({
    message = 'Loading...',
    size = 'large',
    showBackground = true,
    classname = ''
}) => {
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.8,
                    duration: 1000,
                    useNativeDriver: true,
                })
            ])
        );

        pulseAnimation.start();

        return () => {
            pulseAnimation.stop();
        };
    }, [scaleAnim]);

    return (
        <View className={`flex-1 bg-primary justify-center items-center ${classname}`}>
            {showBackground && (
                <Image source={images.bg} className="absolute w-full h-full z-0"/>
            )}
            
            <Animated.View 
                style={{ transform: [{ scale: scaleAnim }] }}
                className="items-center"
            >
                <View className="relative">
                    <ActivityIndicator size={size} color='accent'/>
                    <View className="absolute inset-0 rounded-full bg-accent/10" />
                </View>
                
                <Text className="text-white mt-4 text-lg font-medium">
                    {message}
                </Text>
                
                <LoadingDots />
                
                <View className="mt-6 opacity-40">
                    <Text className="text-gray-400 text-sm text-center">
                        Please wait while we fetch your content
                    </Text>
                </View>
            </Animated.View>
        </View>
    )
}, (prevProps, nextProps) => {
    return (
        prevProps.message === nextProps.message &&
        prevProps.size === nextProps.size &&
        prevProps.showBackground === nextProps.showBackground &&
        prevProps.classname === nextProps.classname
    );
});

Loading.displayName = 'Loading';

export default Loading