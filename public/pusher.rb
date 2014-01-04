require 'json'
require 'digest/sha2'
require 'net/http'
module Pusher
  ENDPOINT = 'fierce-beach-8052.herokuapp.com'
  class << self
    attr_writer :SECRET_KEY
    def SECRET_KEY
      @SECRET_KEY || ENV['PUSHER_SECRET_KEY'] || (@RAND_KEY||=rand)
    end

    def send data, models=nil
      models = [models] unless models.is_a? Array
      query = {
        keys: models.map{|m|group_id m}.to_json,
        data: data.to_json
      }
      Net::HTTP.new(*ENDPOINT.split(':')).post('/', URI.encode_www_form(query))
    end

    def group_id model
      if model.respond_to? :id
        key = "#{model.class.name}_#{model.id}"
      else
        key = model.to_s
      end
      "#{self.SECRET_KEY}_#{key}"
    end

    def listen *models
      models.push(nil).map{|model|Digest::SHA2.hexdigest group_id(model)}.to_json
    end
  end
end
