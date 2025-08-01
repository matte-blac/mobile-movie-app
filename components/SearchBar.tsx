import {View, Text, Image, TextInput} from 'react-native'
import React, { memo, useCallback } from 'react'
import {icons} from "@/constants/icons";

interface Props {
    placeholder: string;
    onPress?: () => void;
    value?: string;
    onChangeText?: (text: string) => void;
}

const SearchBar = memo(({ placeholder, onPress, value, onChangeText }: Props) => {
    const handleChangeText = useCallback((text: string) => {
        onChangeText?.(text);
    }, [onChangeText]);

    const handlePress = useCallback(() => {
        onPress?.();
    }, [onPress]);

    return (
        <View className="flex-row items-center bg-dark-200 rounded-full px-5 py-4">
            <Image source={icons.search} className="size-5" resizeMode="contain" tintColor="#ab8bff"/>
            <TextInput
                onPress={handlePress}
                placeholder={placeholder}
                value={value}
                onChangeText={handleChangeText}
                placeholderTextColor="#a8b5db"
                className="flex-1 ml-2 text-white"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                blurOnSubmit={false}
                clearButtonMode="while-editing"
            />
        </View>
    )
}, (prevProps, nextProps) => {
    return (
        prevProps.placeholder === nextProps.placeholder &&
        prevProps.value === nextProps.value &&
        prevProps.onPress === nextProps.onPress &&
        prevProps.onChangeText === nextProps.onChangeText
    )
})

SearchBar.displayName = 'SearchBar';

export default SearchBar