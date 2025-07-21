import {View, Text, Image, ImageBackground} from 'react-native'
import React from 'react'
import {Tabs} from "expo-router";
// import {ImageBackground} from "expo-image";
import {images} from "@/constants/images";
import {icons} from "@/constants/icons";

const TabIcon = ({focused, icon, title}: any) => {
    if(focused) {
    return (
            <ImageBackground
                source={images.highlight}
                className='flex flex-row w-full flex-1 min-w-[112px] min-h-16 justify-center items-center rounded-full overflow-hidden mt-3'
            >
                <Image source={icon} tintColor='#151312' className='size-5' />
                <Text className='text-secondary text-base font-semibold ml-2'>{title}</Text>
            </ImageBackground>
        )
    }
    return (
        <View className='size-full justify-center items-center rounded-full mt-4'>
            <Image source={icon} tintColor='#a8b5db' className='size-5' />
        </View>
    )
}

const _Layout = () => {
    return (
        <Tabs
        screenOptions={{
            tabBarShowLabel: false,
            tabBarItemStyle: {
                width: '100%',
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center'
            },
            tabBarStyle: {
                backgroundColor: '#0f0d23',
                borderRadius: 50,
                marginHorizontal: 10,
                marginBottom: 36,
                height: 52,
                position: 'absolute',
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: '#0f0d23'
            }
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            icon={icons.home}
                            title='Home'
                        />
                    )
            }}
            />
            <Tabs.Screen
            name="search"
            options={{
                title: 'Search',
                headerShown: false,
                tabBarIcon: ({ focused }) => (
                    <TabIcon
                        focused={focused}
                        icon={icons.search}
                        title='Search'
                    />
                )
            }}
        />
            <Tabs.Screen
                name="saved"
                options={{
                    title: 'Saved',
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            icon={icons.save}
                            title='Saved'
                        />
                    )
                }}
            />

            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            icon={icons.person}
                            title='Profile'
                        />
                    )
                }}
            />
        </Tabs>
    )
}
export default _Layout
